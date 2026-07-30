BASE_URL = "https://akademiata.pl"

INCLUDE_KEYWORDS = [
    "admission", "rekrutacja", "kandydat",
    "tuition", "czesne", "oplaty", "kalkulator",
    "oferta", "program", "kierunki", "studia",
    "faculty", "wydzial", "wladze",
    "contact", "kontakt",
    "regulation", "regulamin",
    "scholarship", "stypendia",
    "erasmus",
    "student", "biblioteka", "harmonogram", "kariera", "e-learning",
    "dean", "dziekan",
    "calendar", "kalendarz",
    "faq",
]

IGNORE_PATTERNS = [
    "/wp-admin",
    "/feed",
    "/search",
    "/tag/",
    "/category/",
]

MAX_PAGES = 300
REQUEST_DELAY_SECONDS = 1.0
REQUEST_TIMEOUT_SECONDS = 15
USER_AGENT = "ATA-Rag-Crawler/1.0 (+student project; contact: mehmetsdk6@gmail.com)"

MAX_CHUNK_CHARS = 1500
