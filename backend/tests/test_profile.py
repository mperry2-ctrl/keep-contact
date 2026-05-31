import pytest

pytestmark = pytest.mark.skip(reason="profile router not yet implemented (CLAUDE.md Next Steps #4)")

# I35: No profile → PUT /profile/ {name, bio} → 200, profile created
# I36: Profile exists → PUT /profile/ {name updated} → 200, updated
# I37: Profile exists → GET /profile/ as owner → 200, correct
# I38: Profile exists for A → GET /profile/ as B → 200, B's own empty profile


def test_I35_create_profile(): ...
def test_I36_update_profile(): ...
def test_I37_get_own_profile(): ...
def test_I38_profile_isolation(): ...
