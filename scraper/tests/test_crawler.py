from crawler import _is_in_scope, _normalize


def test_trailing_slash_normalizes_to_same_url():
    assert _normalize("https://site.com/page") == _normalize("https://site.com/page/")


def test_fragment_does_not_create_a_distinct_url():
    assert _normalize("https://site.com/page#section") == _normalize("https://site.com/page")


def test_root_path_normalizes_consistently():
    assert _normalize("https://site.com") == _normalize("https://site.com/")


def test_in_scope_rejects_other_domains():
    assert _is_in_scope("https://other-site.com/admissions", "site.com") is False


def test_in_scope_rejects_ignored_paths():
    assert _is_in_scope("https://site.com/wp-admin/edit", "site.com") is False
