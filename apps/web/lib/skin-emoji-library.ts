/**
 * Keyword → emoji library for Skin Studio.
 *
 * Given a creator's seed or refinement prompt, pick a single emoji that best
 * matches the vibe — used to override the floating-decoration emojis in the
 * custom skin preview.
 *
 * First match wins. Keywords are checked as whole-word substrings against a
 * lowercased, de-punctuated version of the prompt.
 */

interface EmojiEntry {
  emoji: string;
  keywords: string[];
}

const EMOJI_LIBRARY: EmojiEntry[] = [
  // ── Food & drink ────────────────────────────────────────────────────────────
  { emoji: "☕",  keywords: ["coffee", "espresso", "latte", "caffeine", "cafe", "barista", "brew"] },
  { emoji: "🍵",  keywords: ["tea", "matcha", "herbal", "chai"] },
  { emoji: "🍳",  keywords: ["food", "cook", "cooking", "chef", "culinary", "kitchen", "meal", "recipe", "breakfast", "egg"] },
  { emoji: "🍕",  keywords: ["pizza", "slice"] },
  { emoji: "🍔",  keywords: ["burger", "hamburger", "fast food"] },
  { emoji: "🌮",  keywords: ["taco", "mexican"] },
  { emoji: "🍜",  keywords: ["ramen", "noodle", "noodles", "soup", "asian"] },
  { emoji: "🍣",  keywords: ["sushi", "japanese"] },
  { emoji: "🥗",  keywords: ["salad", "healthy", "veggie", "nutrition", "clean", "plant based", "vegan", "vegetarian"] },
  { emoji: "🍷",  keywords: ["wine", "sommelier", "vineyard", "merlot"] },
  { emoji: "🍺",  keywords: ["beer", "brewery", "ale", "lager"] },
  { emoji: "🍰",  keywords: ["cake", "dessert", "bake", "baker", "baking", "pastry"] },
  { emoji: "🍦",  keywords: ["ice cream", "sweet", "summer treat"] },
  { emoji: "🍫",  keywords: ["chocolate", "cocoa"] },
  { emoji: "🍎",  keywords: ["apple", "fruit"] },
  { emoji: "🍓",  keywords: ["strawberry", "berry", "berries"] },
  { emoji: "🥑",  keywords: ["avocado", "toast", "brunch"] },
  { emoji: "🍄",  keywords: ["mushroom", "fungi", "forage"] },
  { emoji: "🌶️",  keywords: ["spicy", "chili", "pepper", "heat"] },
  { emoji: "🍯",  keywords: ["honey", "natural sweetener"] },

  // ── Fitness / movement ──────────────────────────────────────────────────────
  { emoji: "💪",  keywords: ["fitness", "gym", "muscle", "workout", "strength", "lift", "bodybuild", "lifting"] },
  { emoji: "🧘",  keywords: ["yoga", "meditation", "zen", "mindful", "mindfulness", "breathe", "calm"] },
  { emoji: "🏃",  keywords: ["run", "runner", "running", "jog", "jogging", "marathon", "sprint"] },
  { emoji: "🚴",  keywords: ["bike", "cycle", "cycling", "biking", "cyclist"] },
  { emoji: "🏊",  keywords: ["swim", "swimming", "pool", "swimmer"] },
  { emoji: "🥊",  keywords: ["box", "boxing", "fight", "combat", "martial", "kickbox"] },
  { emoji: "🏋️",  keywords: ["weightlifting", "powerlift", "powerlifting", "deadlift", "squat", "barbell"] },
  { emoji: "⚽",  keywords: ["soccer", "football"] },
  { emoji: "🏀",  keywords: ["basketball", "hoops", "ball"] },
  { emoji: "🎾",  keywords: ["tennis"] },
  { emoji: "⛳",  keywords: ["golf"] },
  { emoji: "🏈",  keywords: ["american football", "nfl"] },
  { emoji: "⛸️",  keywords: ["skate", "skating", "ice skate"] },
  { emoji: "🛹",  keywords: ["skateboard", "skater", "skateboarding"] },
  { emoji: "🏄",  keywords: ["surf", "surfing", "surfer"] },
  { emoji: "🧗",  keywords: ["climb", "climbing", "bouldering", "rock climb"] },
  { emoji: "💃",  keywords: ["dance", "dancer", "ballet", "choreo", "choreography", "dancing"] },
  { emoji: "🤸",  keywords: ["gymnastics", "cartwheel", "acrobat", "mobility"] },
  { emoji: "🚶",  keywords: ["walk", "walking", "step", "steps"] },
  { emoji: "🏇",  keywords: ["horse", "equestrian", "riding"] },

  // ── Outdoors / weather / celestial ──────────────────────────────────────────
  { emoji: "⛰️",  keywords: ["hike", "hiking", "mountain", "mountains", "adventure", "outdoor", "outdoors", "trail", "wilderness", "peak"] },
  { emoji: "🌊",  keywords: ["water", "ocean", "wave", "waves", "surf", "flow", "fluid", "aquatic", "sea"] },
  { emoji: "🏖️",  keywords: ["beach", "tropical", "vacation", "sand", "seaside", "coast"] },
  { emoji: "🏕️",  keywords: ["camp", "camping", "tent", "campfire"] },
  { emoji: "☀️",  keywords: ["sun", "sunny", "warm", "bright", "summer", "golden", "daylight"] },
  { emoji: "🌙",  keywords: ["moon", "night", "sleep", "dark", "midnight", "lunar", "nightly"] },
  { emoji: "❄️",  keywords: ["snow", "winter", "cold", "ice", "frost", "snowflake"] },
  { emoji: "⚡",  keywords: ["lightning", "electric", "energy", "fast", "power", "charged", "bolt"] },
  { emoji: "🔥",  keywords: ["fire", "hot", "flame", "intense", "bold", "passion", "fierce", "burn"] },
  { emoji: "🌧️",  keywords: ["rain", "storm", "moody", "cloudy", "stormy", "rainy"] },
  { emoji: "🌈",  keywords: ["rainbow", "pride", "colorful"] },
  { emoji: "🌋",  keywords: ["volcano", "eruption", "molten"] },
  { emoji: "🏔️",  keywords: ["alpine", "snowy peak", "summit"] },

  // ── Plants & nature ─────────────────────────────────────────────────────────
  { emoji: "🌿",  keywords: ["leaf", "leaves", "plant", "nature", "garden", "organic", "green", "botanical", "herb"] },
  { emoji: "🌱",  keywords: ["sprout", "grow", "growth", "beginner", "seed", "seedling", "starter"] },
  { emoji: "🌸",  keywords: ["flower", "bloom", "floral", "blossom", "cherry", "sakura", "pink"] },
  { emoji: "🌳",  keywords: ["tree", "forest", "wood", "woodland", "oak"] },
  { emoji: "🌴",  keywords: ["palm", "palms", "tropical tree"] },
  { emoji: "🌺",  keywords: ["wellness", "health", "healing", "hibiscus", "aloha"] },
  { emoji: "🌻",  keywords: ["sunflower", "cheerful"] },
  { emoji: "🌷",  keywords: ["tulip"] },
  { emoji: "🪴",  keywords: ["potted plant", "houseplant", "indoor plant"] },
  { emoji: "🍂",  keywords: ["autumn", "fall", "leaves falling"] },

  // ── Animals ─────────────────────────────────────────────────────────────────
  { emoji: "🐒",  keywords: ["monkey", "ape", "primate"] },
  { emoji: "🦍",  keywords: ["gorilla", "alpha"] },
  { emoji: "🐶",  keywords: ["dog", "puppy", "pup", "canine"] },
  { emoji: "🐱",  keywords: ["cat", "kitten", "feline", "kitty"] },
  { emoji: "🐺",  keywords: ["wolf", "pack", "lone wolf"] },
  { emoji: "🦊",  keywords: ["fox", "foxy", "cunning"] },
  { emoji: "🐻",  keywords: ["bear"] },
  { emoji: "🐼",  keywords: ["panda"] },
  { emoji: "🦁",  keywords: ["lion", "pride", "king of the jungle"] },
  { emoji: "🐯",  keywords: ["tiger", "fierce"] },
  { emoji: "🐴",  keywords: ["horse pony", "steed"] },
  { emoji: "🦄",  keywords: ["unicorn", "magical"] },
  { emoji: "🐘",  keywords: ["elephant"] },
  { emoji: "🦒",  keywords: ["giraffe"] },
  { emoji: "🐢",  keywords: ["turtle", "slow and steady"] },
  { emoji: "🐍",  keywords: ["snake", "serpent"] },
  { emoji: "🦋",  keywords: ["butterfly", "transformation", "metamorphosis"] },
  { emoji: "🐝",  keywords: ["bee", "busy bee", "honeybee"] },
  { emoji: "🐞",  keywords: ["ladybug", "lucky bug"] },
  { emoji: "🐬",  keywords: ["dolphin"] },
  { emoji: "🐳",  keywords: ["whale"] },
  { emoji: "🐙",  keywords: ["octopus"] },
  { emoji: "🦅",  keywords: ["eagle", "hawk"] },
  { emoji: "🦉",  keywords: ["owl", "wise", "wisdom"] },
  { emoji: "🐓",  keywords: ["rooster", "chicken", "farm animal"] },
  { emoji: "🐑",  keywords: ["sheep", "lamb"] },
  { emoji: "🐮",  keywords: ["cow", "cattle"] },
  { emoji: "🐐",  keywords: ["goat", "greatest"] },

  // ── Art / media / creativity ────────────────────────────────────────────────
  { emoji: "🎵",  keywords: ["music", "sound", "song", "melody", "audio", "tune", "musical"] },
  { emoji: "🎧",  keywords: ["headphone", "headphones", "listen", "podcast", "audio"] },
  { emoji: "🎙️",  keywords: ["mic", "microphone", "record", "recording", "interview", "broadcast", "podcaster"] },
  { emoji: "🎸",  keywords: ["guitar", "band", "rock", "acoustic", "strum"] },
  { emoji: "🎹",  keywords: ["piano", "keyboard", "classical", "keys"] },
  { emoji: "🥁",  keywords: ["drum", "drums", "beat", "rhythm", "percussion"] },
  { emoji: "🎷",  keywords: ["saxophone", "sax", "jazz"] },
  { emoji: "🎤",  keywords: ["singer", "singing", "karaoke", "vocalist"] },
  { emoji: "🎨",  keywords: ["paint", "painting", "art", "creative", "design", "artist", "illustration", "painter"] },
  { emoji: "📸",  keywords: ["camera", "photo", "photography", "lens", "shoot", "photographer"] },
  { emoji: "🎬",  keywords: ["film", "movie", "cinema", "director", "video", "filmmaker"] },
  { emoji: "📖",  keywords: ["book", "read", "reading", "literature", "study", "novel", "reader"] },
  { emoji: "✏️",  keywords: ["pencil", "write", "writer", "journal", "writing", "author"] },
  { emoji: "🖌️",  keywords: ["brush", "watercolor", "calligraphy"] },
  { emoji: "🎭",  keywords: ["theater", "theatre", "drama", "acting", "actor", "perform"] },
  { emoji: "🪄",  keywords: ["magic wand", "wizard", "spell"] },
  { emoji: "📝",  keywords: ["memo", "notes", "copywriting", "copy"] },

  // ── Tech / pro / building ───────────────────────────────────────────────────
  { emoji: "🧠",  keywords: ["brain", "mind", "think", "thinking", "psychology", "mental", "cognitive", "iq"] },
  // Note: "program" is excluded — every creator on JourneyLine builds a "program."
  { emoji: "💻",  keywords: ["code", "coding", "computer", "laptop", "developer", "programming", "software", "dev", "engineer", "engineering", "coder"] },
  { emoji: "📱",  keywords: ["phone", "mobile", "smartphone", "app"] },
  { emoji: "🖥️",  keywords: ["desktop", "monitor", "workstation"] },
  { emoji: "⌨️",  keywords: ["keyboard", "typing"] },
  { emoji: "🤖",  keywords: ["robot", "ai", "automation", "bot", "machine learning"] },
  { emoji: "🔧",  keywords: ["tool", "build", "craft", "workshop", "fix", "wrench", "tinker"] },
  { emoji: "🛠️",  keywords: ["tools", "maker", "diy", "handyman", "craftsman"] },
  { emoji: "🔬",  keywords: ["lab", "science", "research", "experiment", "microscope", "scientist"] },
  { emoji: "🧪",  keywords: ["chemistry", "chemist", "potion", "formula"] },
  { emoji: "⚗️",  keywords: ["alchemy", "alchemist", "distill"] },
  { emoji: "📈",  keywords: ["chart", "data", "analytics", "growth", "metrics", "trend", "trending"] },
  { emoji: "📊",  keywords: ["bar chart", "stats", "statistics", "kpi"] },
  { emoji: "🚀",  keywords: ["rocket", "launch", "startup", "ambitious", "founder", "scale", "moonshot"] },
  { emoji: "🎯",  keywords: ["target", "goal", "focus", "focused", "aim", "precise", "precision", "bullseye"] },
  { emoji: "💡",  keywords: ["light", "idea", "ideas", "inspire", "insight", "bulb", "innovation", "lightbulb"] },
  { emoji: "💰",  keywords: ["money", "finance", "financial", "invest", "investing", "wealth", "cash", "income"] },
  { emoji: "💸",  keywords: ["spend", "spending", "expense"] },
  { emoji: "📉",  keywords: ["decline", "bear market"] },
  { emoji: "🏆",  keywords: ["trophy", "win", "winning", "champion", "achieve", "success", "victory", "winner"] },
  { emoji: "🥇",  keywords: ["gold medal", "first place", "elite", "medal", "award"] },
  { emoji: "📣",  keywords: ["announce", "announcement", "marketing", "marketer", "promote"] },
  { emoji: "📬",  keywords: ["newsletter", "inbox", "email marketing"] },
  { emoji: "🗂️",  keywords: ["organize", "organization", "productivity", "project management"] },
  { emoji: "🧮",  keywords: ["math", "abacus", "numbers", "arithmetic"] },

  // ── Lifestyle / vibe ────────────────────────────────────────────────────────
  { emoji: "✨",  keywords: ["sparkle", "sparkles", "magic", "magical", "wonder", "glam", "shine", "glow", "whimsy", "whimsical"] },
  { emoji: "💎",  keywords: ["diamond", "gem", "luxury", "luxurious", "premium", "elegant", "refined"] },
  { emoji: "👑",  keywords: ["crown", "royal", "royalty", "high end", "regal"] },
  { emoji: "💄",  keywords: ["lipstick", "makeup", "beauty", "cosmetic", "cosmetics"] },
  { emoji: "💅",  keywords: ["nails", "manicure", "selfcare", "self care"] },
  { emoji: "👗",  keywords: ["fashion", "dress", "stylist", "style", "couture"] },
  { emoji: "🧢",  keywords: ["cap", "streetwear", "hat"] },
  { emoji: "🧭",  keywords: ["compass", "direction", "journey", "wanderlust", "explorer", "exploring"] },
  { emoji: "🗺️",  keywords: ["map", "location", "geography", "atlas"] },
  { emoji: "✈️",  keywords: ["plane", "flight", "fly", "travel", "jetset"] },
  { emoji: "🚗",  keywords: ["car", "automotive", "driving", "auto", "road trip"] },
  { emoji: "🏍️",  keywords: ["motorcycle", "motorbike", "biker"] },
  { emoji: "🚂",  keywords: ["train", "locomotive", "railway"] },
  { emoji: "⛵",  keywords: ["sail", "sailing", "boat", "sailboat"] },
  { emoji: "🌍",  keywords: ["globe", "world", "international", "global", "earth", "worldwide"] },
  { emoji: "🔮",  keywords: ["crystal ball", "mystic", "spiritual", "future", "intuition", "psychic", "tarot"] },
  { emoji: "🕉️",  keywords: ["om", "spirituality", "sacred"] },
  { emoji: "☯️",  keywords: ["balance", "yin yang", "harmony"] },
  { emoji: "☮️",  keywords: ["peace", "peaceful", "harmony"] },
  { emoji: "🕊️",  keywords: ["dove", "serenity", "gentle"] },
  { emoji: "🎮",  keywords: ["game", "games", "gaming", "esports", "play", "gamer", "controller"] },
  { emoji: "🎲",  keywords: ["dice", "chance", "luck", "random"] },
  { emoji: "🎈",  keywords: ["kid", "kids", "child", "children", "family", "playful", "birthday", "balloon"] },
  { emoji: "🎁",  keywords: ["gift", "present", "surprise", "reward"] },
  { emoji: "🎀",  keywords: ["bow", "cute", "feminine"] },
  { emoji: "❤️",  keywords: ["heart", "love", "loving", "care", "romance", "romantic", "valentine"] },
  { emoji: "💔",  keywords: ["heartbreak", "grief", "loss"] },
  { emoji: "😊",  keywords: ["smile", "joy", "joyful", "happy", "happiness", "fun", "cheer", "cheerful"] },
  { emoji: "😎",  keywords: ["cool", "confident", "swagger", "chill"] },
  { emoji: "⭐",  keywords: ["star", "stars", "stellar"] },
  { emoji: "🌟",  keywords: ["cosmic", "glowing", "shining"] },
  { emoji: "🪐",  keywords: ["saturn", "planets", "galaxy", "space", "celestial", "astronomy"] },
  { emoji: "🚢",  keywords: ["ship", "cargo", "logistics"] },
  { emoji: "🧗‍♀️", keywords: ["challenge", "grit", "resilience", "perseverance"] },
];

// Precompute a lowercased word list per entry (joined for regex-free matching)
const NORMALIZED: { emoji: string; keywordSet: Set<string> }[] = EMOJI_LIBRARY.map((e) => ({
  emoji: e.emoji,
  keywordSet: new Set(e.keywords.map((k) => k.toLowerCase())),
}));

/** Tokenize a prompt into lowercased words (strips punctuation). */
function tokenize(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Pick an emoji that best matches the prompt. Returns null when no match.
 *
 * First keyword hit wins. Multi-word keywords (e.g. "high end") are checked
 * against the full prompt string as a substring in addition to the word split.
 */
export function pickEmojiFromPrompt(prompt: string | null | undefined): string | null {
  if (!prompt) return null;
  const words = tokenize(prompt);
  const wordSet = new Set(words);
  const lowerPrompt = prompt.toLowerCase();

  for (const entry of NORMALIZED) {
    for (const kw of entry.keywordSet) {
      if (kw.includes(" ")) {
        if (lowerPrompt.includes(kw)) return entry.emoji;
      } else if (wordSet.has(kw)) {
        return entry.emoji;
      }
    }
  }
  return null;
}

/** A small, opinionated default set for the "nothing typed yet" state. */
export const POPULAR_EMOJIS = ["✨", "☕", "💪", "🧘", "🔥", "🌿", "🚀", "🎨", "📖", "🌙", "🌊", "⭐"] as const;

/**
 * Return up to `limit` emoji entries that match the query. Ranks exact
 * word matches above substring / multi-word hits. De-duplicates emojis so
 * the same glyph isn't surfaced twice. When the query is empty, returns
 * the popular default set.
 */
export function findEmojis(
  query: string | null | undefined,
  limit = 8,
): string[] {
  if (!query || !query.trim()) {
    return POPULAR_EMOJIS.slice(0, limit);
  }
  const words = tokenize(query);
  const wordSet = new Set(words);
  const lower = query.toLowerCase();

  const exact: string[] = [];
  const substring: string[] = [];
  const seen = new Set<string>();

  for (const entry of NORMALIZED) {
    if (seen.has(entry.emoji)) continue;
    let bucket: "exact" | "substring" | null = null;
    for (const kw of entry.keywordSet) {
      if (kw.includes(" ")) {
        if (lower.includes(kw)) bucket = bucket ?? "substring";
      } else if (wordSet.has(kw)) {
        bucket = "exact";
        break;
      } else if (lower.includes(kw) && kw.length >= 4) {
        // partial match for long keywords only, to avoid "tea" in "tears"
        bucket = bucket ?? "substring";
      }
    }
    if (bucket === "exact") {
      exact.push(entry.emoji);
      seen.add(entry.emoji);
    } else if (bucket === "substring") {
      substring.push(entry.emoji);
      seen.add(entry.emoji);
    }
    if (exact.length >= limit) break;
  }

  return [...exact, ...substring].slice(0, limit);
}
