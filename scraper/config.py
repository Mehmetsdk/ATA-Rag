# TODO: Gerçek üniversite domaini netleşince güncelle
BASE_URL = "https://akademiata.pl"

INCLUDE_KEYWORDS = [
    "admission", "rekrutacja",
    "tuition", "czesne", "oplaty",
    "program", "kierunki", "studia",
    "faculty", "wydzial",
    "contact", "kontakt",
    "regulation", "regulamin",
    "scholarship", "stypendia",
    "erasmus",
    "student-office", "dziekanat",
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
