import uuid
import urllib.parse
from datetime import date, datetime, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

try:
    import vobject
    _VOBJECT_OK = True
except ImportError:
    _VOBJECT_OK = False

try:
    import phonenumbers
    _PHONENUMBERS_OK = True
except ImportError:
    _PHONENUMBERS_OK = False

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import Contact
from ..schemas import ImportContactPreview, ImportConfirmRequest, ImportConfirmResult

router = APIRouter(prefix="/import", tags=["import"])

# --- Session store -----------------------------------------------------------

_sessions: dict[str, tuple[list[dict], datetime]] = {}
_SESSION_TTL = timedelta(hours=1)

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_PEOPLE_URL = "https://people.googleapis.com/v1/people/me/connections"
_GOOGLE_GROUPS_URL = "https://people.googleapis.com/v1/contactGroups"
_GOOGLE_SCOPE = "https://www.googleapis.com/auth/contacts.readonly"

_PERSON_FIELDS = (
    "names,nicknames,phoneNumbers,emailAddresses,organizations,"
    "addresses,birthdays,memberships,urls,biographies,imClients"
)

_COUNTRY_NAMES: dict[str, str] = {
    "united states": "US", "united states of america": "US", "usa": "US",
    "canada": "CA", "united kingdom": "GB", "great britain": "GB", "uk": "GB",
    "australia": "AU", "germany": "DE", "france": "FR", "spain": "ES",
    "italy": "IT", "japan": "JP", "china": "CN", "india": "IN",
    "brazil": "BR", "mexico": "MX", "netherlands": "NL", "sweden": "SE",
    "norway": "NO", "denmark": "DK", "finland": "FI", "switzerland": "CH",
    "austria": "AT", "belgium": "BE", "portugal": "PT", "ireland": "IE",
    "new zealand": "NZ", "south korea": "KR", "singapore": "SG",
    "argentina": "AR", "chile": "CL", "colombia": "CO", "peru": "PE",
    "south africa": "ZA", "nigeria": "NG", "kenya": "KE", "egypt": "EG",
    "israel": "IL", "turkey": "TR", "russia": "RU", "ukraine": "UA",
    "poland": "PL", "czech republic": "CZ", "hungary": "HU", "romania": "RO",
    "greece": "GR", "thailand": "TH", "indonesia": "ID", "malaysia": "MY",
    "philippines": "PH", "vietnam": "VN", "taiwan": "TW", "hong kong": "HK",
}


def _store_session(data: list[dict]) -> str:
    key = str(uuid.uuid4())
    expired = [k for k, (_, t) in _sessions.items() if datetime.utcnow() - t > _SESSION_TTL]
    for k in expired:
        del _sessions[k]
    _sessions[key] = (data, datetime.utcnow())
    return key


def _get_session(key: str) -> Optional[list[dict]]:
    entry = _sessions.get(key)
    if not entry:
        return None
    data, created_at = entry
    if datetime.utcnow() - created_at > _SESSION_TTL:
        del _sessions[key]
        return None
    return data


# --- Utilities ---------------------------------------------------------------

def _normalize_phone(raw: str) -> str:
    if not raw or not raw.strip():
        return raw
    if not _PHONENUMBERS_OK:
        return raw.strip()
    try:
        parsed = phonenumbers.parse(raw.strip(), "US")
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except Exception:
        pass
    return raw.strip()


def _country_to_code(raw: str) -> Optional[str]:
    if not raw:
        return None
    raw = raw.strip()
    if len(raw) == 2:
        return raw.upper()
    return _COUNTRY_NAMES.get(raw.lower())


def _parse_google_person(person: dict, groups: dict[str, str]) -> Optional[dict]:
    names = person.get("names", [])
    if not names:
        return None
    name = names[0].get("displayName", "").strip()
    if not name:
        return None

    nicks = person.get("nicknames", [])
    nickname = nicks[0].get("value") if nicks else None

    # Phone — prefer mobile/cell
    phones = person.get("phoneNumbers", [])
    phone = None
    if phones:
        _prio = ["mobile", "cell", "main", "work", "home"]
        def _rank(p: dict) -> int:
            t = (p.get("canonicalForm") or p.get("type") or "").lower()
            for i, pt in enumerate(_prio):
                if pt in t:
                    return i
            return len(_prio)
        best = sorted(phones, key=_rank)[0]
        raw = best.get("value", "")
        if raw:
            phone = _normalize_phone(raw)

    emails = person.get("emailAddresses", [])
    email = emails[0].get("value") if emails else None

    orgs = person.get("organizations", [])
    company = orgs[0].get("name") if orgs else None
    job_title = orgs[0].get("title") if orgs else None

    city = state = country_code = postal_code = None
    addrs = person.get("addresses", [])
    if addrs:
        a = addrs[0]
        city = a.get("city") or None
        state = a.get("region") or None
        postal_code = a.get("postalCode") or None
        country_code = _country_to_code(a.get("countryCode") or a.get("country") or "")

    birthday = None
    bdays = person.get("birthdays", [])
    if bdays:
        bd = bdays[0].get("date", {})
        m, d, y = bd.get("month"), bd.get("day"), bd.get("year") or 2000
        if m and d:
            try:
                birthday = date(y, m, d)
            except ValueError:
                pass

    tags: list[str] = []
    for membership in person.get("memberships", []):
        cgm = membership.get("contactGroupMembership", {})
        label = groups.get(cgm.get("contactGroupResourceName", ""))
        if label:
            tags.append(label)

    extra: list[str] = []
    if len(phones) > 1:
        for p in phones[1:]:
            extra.append(f"Phone ({p.get('type', 'other')}): {p.get('value', '')}")
    if len(emails) > 1:
        for e in emails[1:]:
            extra.append(f"Email ({e.get('type', 'other')}): {e.get('value', '')}")
    for url in person.get("urls", []):
        extra.append(f"URL ({url.get('type', 'other')}): {url.get('value', '')}")
    for bio in person.get("biographies", []):
        v = bio.get("value", "").strip()
        if v:
            extra.append(v)
    for im in person.get("imClients", []):
        extra.append(f"IM ({im.get('protocol', 'IM')}): {im.get('username', '')}")

    return {
        "name": name,
        "nickname": nickname,
        "email": email,
        "phone": phone or None,
        "birthday": birthday,
        "job_title": job_title or None,
        "company": company or None,
        "city": city,
        "state": state,
        "country_code": country_code,
        "postal_code": postal_code,
        "tags": tags or None,
        "general_notes": "\n".join(extra) or None,
    }


def _parse_vcard(component) -> Optional[dict]:
    if getattr(component, "name", "") != "VCARD":
        return None

    name = None
    if hasattr(component, "fn"):
        name = component.fn.value.strip()
    elif hasattr(component, "n"):
        n = component.n.value
        parts = [p.strip() for p in [getattr(n, "given", ""), getattr(n, "family", "")] if p and p.strip()]
        name = " ".join(parts)
    if not name:
        return None

    nickname = component.nickname.value.strip() if hasattr(component, "nickname") else None

    phones = component.contents.get("tel", [])
    phone = None
    if phones:
        cell = [p for p in phones if any(x in str(p.params).upper() for x in ("CELL", "MOBILE"))]
        chosen = (cell or phones)[0]
        raw = chosen.value if isinstance(chosen.value, str) else str(chosen.value)
        phone = _normalize_phone(raw)

    emails = component.contents.get("email", [])
    email = emails[0].value if emails else None

    company = None
    job_title = None
    if hasattr(component, "org"):
        org_val = component.org.value
        company = (org_val[0] if isinstance(org_val, list) else org_val) or None
    if hasattr(component, "title"):
        job_title = component.title.value or None

    city = state = country_code = postal_code = None
    country_name_fallback = None
    addrs = component.contents.get("adr", [])
    if addrs:
        adr = addrs[0].value
        city = (getattr(adr, "city", "") or "").strip() or None
        state = (getattr(adr, "region", "") or "").strip() or None
        postal_code = (getattr(adr, "code", "") or "").strip() or None
        raw_country = (getattr(adr, "country", "") or "").strip()
        country_code = _country_to_code(raw_country)
        if raw_country and not country_code:
            country_name_fallback = raw_country

    birthday = None
    if hasattr(component, "bday"):
        bval = component.bday.value
        try:
            if isinstance(bval, date):
                birthday = bval
            elif isinstance(bval, str):
                clean = bval.replace("-", "")
                if clean.startswith("--"):
                    m, d = int(clean[2:4]), int(clean[4:6])
                    birthday = date(2000, m, d)
                elif len(clean) == 8:
                    birthday = date(int(clean[:4]), int(clean[4:6]), int(clean[6:8]))
        except (ValueError, TypeError):
            pass

    tags: list[str] = []
    if hasattr(component, "categories"):
        cats = component.categories.value
        if isinstance(cats, (list, tuple)):
            tags = [str(c).strip() for c in cats if str(c).strip()]
        elif isinstance(cats, str):
            tags = [c.strip() for c in cats.split(",") if c.strip()]

    extra: list[str] = []
    if hasattr(component, "note"):
        note_val = component.note.value.strip()
        if note_val:
            extra.append(note_val)
    if len(phones) > 1:
        for p in phones[1:]:
            v = p.value if isinstance(p.value, str) else str(p.value)
            extra.append(f"Phone: {v}")
    if len(emails) > 1:
        for e in emails[1:]:
            extra.append(f"Email: {e.value}")
    for url in component.contents.get("url", []):
        extra.append(f"URL: {url.value}")
    if country_name_fallback:
        extra.append(f"Country: {country_name_fallback}")
    for key, items in component.contents.items():
        if key.startswith("x-"):
            for item in items:
                v = item.value if isinstance(item.value, str) else str(item.value)
                if v.strip():
                    extra.append(f"{key.upper()}: {v}")

    return {
        "name": name,
        "nickname": nickname,
        "email": email,
        "phone": phone or None,
        "birthday": birthday,
        "job_title": job_title,
        "company": company,
        "city": city,
        "state": state,
        "country_code": country_code,
        "postal_code": postal_code,
        "tags": tags or None,
        "general_notes": "\n".join(extra) or None,
    }


async def _with_duplicates(
    contacts: list[dict],
    user_id: str,
    db: AsyncSession,
) -> list[ImportContactPreview]:
    result = await db.execute(select(Contact).where(Contact.user_id == uuid.UUID(user_id)))
    existing = result.scalars().all()

    phone_map: dict[str, Contact] = {}
    email_map: dict[str, Contact] = {}
    for c in existing:
        if c.phone:
            phone_map[c.phone] = c
        if c.email:
            email_map[c.email.lower()] = c

    previews = []
    for data in contacts:
        dup_id = None
        dup_name = None
        phone = data.get("phone")
        email = data.get("email")
        if phone and phone in phone_map:
            dup_id = phone_map[phone].id
            dup_name = phone_map[phone].name
        elif email and email.lower() in email_map:
            match = email_map[email.lower()]
            dup_id = match.id
            dup_name = match.name
        previews.append(ImportContactPreview(**data, duplicate_of=dup_id, duplicate_name=dup_name))

    return previews


async def _fetch_google_contacts(access_token: str) -> list[dict]:
    headers = {"Authorization": f"Bearer {access_token}"}

    groups: dict[str, str] = {}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            _GOOGLE_GROUPS_URL,
            headers=headers,
            params={"groupFields": "name,formattedName,groupType"},
        )
        if resp.status_code == 200:
            for g in resp.json().get("contactGroups", []):
                if g.get("groupType") == "USER_CONTACT_GROUP":
                    resource = g.get("resourceName", "")
                    label = g.get("formattedName") or g.get("name") or ""
                    if resource and label:
                        groups[resource] = label

    all_people: list[dict] = []
    page_token = None
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            params: dict = {"personFields": _PERSON_FIELDS, "pageSize": 1000}
            if page_token:
                params["pageToken"] = page_token
            resp = await client.get(_GOOGLE_PEOPLE_URL, headers=headers, params=params)
            if resp.status_code != 200:
                break
            body = resp.json()
            all_people.extend(body.get("connections", []))
            page_token = body.get("nextPageToken")
            if not page_token:
                break

    parsed = []
    for person in all_people:
        try:
            data = _parse_google_person(person, groups)
            if data:
                parsed.append(data)
        except Exception:
            continue

    return parsed


# --- Endpoints ---------------------------------------------------------------

@router.get("/google/auth-url")
async def google_auth_url():
    session_id = str(uuid.uuid4())
    _sessions[session_id] = ([], datetime.utcnow())

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": f"{settings.backend_url}/import/google/callback",
        "response_type": "code",
        "scope": _GOOGLE_SCOPE,
        "state": session_id,
        "access_type": "online",
        "prompt": "select_account",
    }
    url = _GOOGLE_AUTH_URL + "?" + urllib.parse.urlencode(params)
    return {"url": url, "session_id": session_id}


@router.get("/google/callback")
async def google_callback(code: str = Query(...), state: str = Query(...)):
    redirect_uri = f"{settings.backend_url}/import/google/callback"
    frontend_import = f"{settings.frontend_url}/import"

    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        return RedirectResponse(f"{frontend_import}?error=auth_failed")

    access_token = token_resp.json().get("access_token")
    if not access_token:
        return RedirectResponse(f"{frontend_import}?error=no_token")

    try:
        contacts = await _fetch_google_contacts(access_token)
    except Exception:
        return RedirectResponse(f"{frontend_import}?error=fetch_failed")

    _sessions[state] = (contacts, datetime.utcnow())
    return RedirectResponse(f"{frontend_import}?session_id={state}")


@router.get("/google/contacts", response_model=list[ImportContactPreview])
async def get_google_contacts(
    session_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    raw = _get_session(session_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="Session expired or not found")
    return await _with_duplicates(raw, user["id"], db)


@router.post("/vcf", response_model=list[ImportContactPreview])
async def upload_vcf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if not _VOBJECT_OK:
        raise HTTPException(status_code=501, detail="vobject not installed")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    contacts = []
    try:
        for component in vobject.readComponents(text):
            try:
                data = _parse_vcard(component)
                if data:
                    contacts.append(data)
            except Exception:
                continue
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse vCard file: {e}")

    return await _with_duplicates(contacts, user["id"], db)


@router.post("/confirm", response_model=ImportConfirmResult)
async def confirm_import(
    body: ImportConfirmRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    uid = uuid.UUID(user["id"])
    imported = merged = skipped = 0

    for item in body.contacts:
        if item.action == "skip":
            skipped += 1
            continue

        c = item.contact
        fields = {
            "name": c.name, "nickname": c.nickname, "email": c.email,
            "phone": c.phone, "birthday": c.birthday, "job_title": c.job_title,
            "company": c.company, "city": c.city, "state": c.state,
            "country_code": c.country_code, "postal_code": c.postal_code,
            "tags": c.tags, "general_notes": c.general_notes,
        }

        if item.action == "import":
            new_contact = Contact(**fields, user_id=uid)
            db.add(new_contact)
            imported += 1

        elif item.action == "merge" and item.merge_into:
            result = await db.execute(
                select(Contact).where(Contact.id == item.merge_into, Contact.user_id == uid)
            )
            existing = result.scalar_one_or_none()
            if not existing:
                new_contact = Contact(**fields, user_id=uid)
                db.add(new_contact)
                imported += 1
                continue

            for field, value in fields.items():
                if value is None:
                    continue
                existing_val = getattr(existing, field, None)
                if existing_val is None:
                    setattr(existing, field, value)
                elif field == "tags" and isinstance(existing_val, list) and isinstance(value, list):
                    setattr(existing, field, list(dict.fromkeys(existing_val + value)))
                elif field == "general_notes" and existing_val and value:
                    setattr(existing, field, f"{existing_val}\n---\n{value}")
            merged += 1

    await db.commit()
    return ImportConfirmResult(imported=imported, merged=merged, skipped=skipped)
