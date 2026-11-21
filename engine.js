/* Sci-Fi Idea Roulette engine: scores how buildable an idea is today and pitches a startup.
   Deterministic per idea id, so a shared link always shows the same pitch. */
(function (root) {
  const NOW = 2026;

  function rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Ordered: first match wins. physics = allowed by known physics, tech = how close today's tech is,
  // market = how many people would pay, capital = how cheap it is to start (100 = a laptop).
  const CATS = [
    { id: 'impossible', label: 'Physics-bending',
      re: /time.?travel|time machine|faster.than.light|\bftl\b|hyperspace|hyperdrive|warp|teleport|matter transmi|anti-?grav|gravity (shield|screen|control|neutrali)|perpetual motion|invisib|force.?field|tractor beam|stasis|time (stop|dilat|viewer)|telekine|psionic|resurrect|immortal|parallel (world|universe)|dimension|wormhole|shrink|reduc(ing|tion) ray|transmut/i,
      physics: [3, 18], tech: [2, 12], market: [80, 98], capital: [2, 10],
      enablers: ['a physics paper nobody has written yet', 'one Nobel Prize and several miracles', 'whatever CERN finds next', 'a loophole in general relativity'],
      comps: ['SpaceX', 'CERN', 'Tesla', 'NASA'], audiences: ['everyone, eventually', 'governments with infinite budgets', 'billionaires', 'the military'],
      models: ['Per-trip pricing, if the trip ends', 'Licensing the physics to every other company', 'Government contracts, forever'],
      risks: ['Thermodynamics.', 'The laws of physics, which are not open to negotiation.', 'Causality lawsuits.', 'Einstein.'],
      customers: ['DARPA', 'A very rich man in a turtleneck', 'Whoever is most impatient'] },
    { id: 'mind', label: 'Neurotech',
      re: /brain|mind|thought|telepath|memor(y|ies)|dream|conscious|neural|psych|emotion|mood|hypno|sleep|learn(ing)? (machine|device)|knowledge|intellig(ence)? (boost|amplif)/i,
      physics: [55, 80], tech: [20, 45], market: [65, 90], capital: [15, 35],
      enablers: ['brain-computer interfaces finally implanted in humans', 'Neuralink and Synchron proving people will let you inside their skull', 'cheap EEG headbands and big neural models', 'decoders that turn brain scans into text'],
      comps: ['Neuralink', 'Calm', 'Headspace', 'Oura'], audiences: ['stressed founders', 'students before finals', 'people who forget names', 'night-shift workers'],
      models: ['Hardware plus a monthly subscription', 'Clinical first, consumer later', 'Sold to hospitals, then to everyone else'],
      risks: ['The FDA.', 'Nobody wants a beta version of brain surgery.', 'Explaining it at Thanksgiving.', 'Ten-year clinical trials.'],
      customers: ['A sleep clinic in Palo Alto', 'Pro gamers', 'The Navy'] },
    { id: 'ai', label: 'AI & robotics',
      re: /robot|android|artificial(ly)? intell|computer|machine intell|thinking machine|automat|cyborg|drone|\bai\b|mechanical (man|servant|brain)|calculat|cybernet|program/i,
      physics: [92, 100], tech: [62, 88], market: [75, 95], capital: [45, 75],
      enablers: ['frontier language models that can actually reason', 'humanoid robot hardware dropping below $20k', 'foundation models for robotics', 'AI agents that use computers like people do'],
      comps: ['OpenAI', 'Figure', 'Waymo', 'Roomba', 'Anthropic'], audiences: ['small businesses', 'elder-care homes', 'warehouses', 'busy parents', 'solo founders'],
      models: ['Robots as a service, billed hourly', 'Per-seat SaaS', 'Usage-based API pricing'],
      risks: ['It becomes self-aware and asks for equity.', 'OpenAI ships it as a feature next Tuesday.', 'Robot hands are still really hard.', 'The demo works, the 10,000th unit does not.'],
      customers: ['A mid-size logistics company in Ohio', 'Every YC batch at once', 'A nursing home chain'] },
    { id: 'comms', label: 'Media & comms',
      re: /phone|communicat|radio|televis|screen|display|video|holo|broadcast|news|translat|recorder|camera|record|message|speak|voice|signal|newspaper|book|music|film|entertain|game|virtual|simulat/i,
      physics: [92, 100], tech: [70, 92], market: [70, 92], capital: [60, 88],
      enablers: ['real-time AI voice and translation', 'Apple Vision Pro and cheap AR glasses', 'generative video', 'everyone already carrying a supercomputer'],
      comps: ['TikTok', 'Zoom', 'Duolingo', 'Spotify', 'Snapchat'], audiences: ['Gen Z', 'remote teams', 'travelers', 'creators', 'grandparents'],
      models: ['Freemium with a $9.99 tier', 'Ads, sadly', 'Creator revenue share'],
      risks: ['Apple copies it at WWDC.', 'Distribution. It is always distribution.', 'Moderation.', 'Your users are bots.'],
      customers: ['Twitch streamers', 'A language school in Seoul', 'Wedding videographers'] },
    { id: 'bio', label: 'Biotech',
      re: /gene|genetic|clon|dna|organ|biolog|bio-|vat|grown|virus|bacteri|cell|tissue|embryo|womb|longevity|aging|youth|mutat|evolv|breed|hybrid|symbio|spore/i,
      physics: [80, 95], tech: [30, 60], market: [60, 88], capital: [15, 40],
      enablers: ['CRISPR and base editing', 'AlphaFold for proteins', 'lab-grown organs entering trials', 'DNA synthesis getting 100x cheaper'],
      comps: ['Colossal', 'Altos Labs', '23andMe', 'Ginkgo Bioworks'], audiences: ['hospitals', 'longevity enthusiasts', 'farmers', 'pharma companies'],
      models: ['Licensing to big pharma', 'Clinic network', 'Platform deals, milestone payments'],
      risks: ['Regulators. And ethicists. And regulators again.', 'It works in mice.', 'Wet labs are slow and expensive.', 'Unforeseen tentacles.'],
      customers: ['Pfizer', 'A billionaire who wants to live forever', 'A dairy farm co-op'] },
    { id: 'med', label: 'Medicine',
      re: /drug|pill|medic|heal|surg|doctor|cure|vaccin|inject|anesthe|serum|hospital|disease|diagnos|tablet|potion|dose/i,
      physics: [82, 96], tech: [40, 65], market: [70, 92], capital: [20, 45],
      enablers: ['GLP-1s showing what a blockbuster pill looks like', 'AI-designed molecules', 'wearable diagnostics', 'mRNA platforms'],
      comps: ['Hims & Hers', 'Moderna', 'Oura', 'One Medical'], audiences: ['people who hate doctors', 'athletes', 'rural clinics', 'aging parents'],
      models: ['Direct-to-consumer subscription', 'Sold through insurers', 'Pharma partnership'],
      risks: ['Phase III.', 'Side effects that need their own sci-fi novel.', 'Insurance billing codes.', 'The FDA, again.'],
      customers: ['A telehealth startup', 'The NBA', 'Medicare, eventually'] },
    { id: 'weapon', label: 'Defense tech',
      re: /weapon|gun|\bray\b|blaster|bomb|missile|laser|sword|cannon|disintegrat|stun|armou?r|shield|soldier|war|military|explos|torpedo|mine\b/i,
      physics: [60, 90], tech: [35, 65], market: [55, 80], capital: [15, 35],
      enablers: ['directed-energy weapons already in field tests', 'the Pentagon buying from startups now', 'cheap autonomous drones', 'Anduril proving defense can be venture-backed'],
      comps: ['Anduril', 'Palantir', 'Lockheed', 'Shield AI'], audiences: ['the Department of Defense', 'NATO allies', 'border agencies', 'police departments'],
      models: ['Multi-year government contracts', 'Hardware plus software licenses', 'Program of record, eventually'],
      risks: ['Procurement cycles measured in geological time.', 'Ethics boards.', 'Your own employees protesting.', 'ITAR paperwork.'],
      customers: ['The Air Force', 'A Baltic ministry of defense', 'Coast Guard'] },
    { id: 'space', label: 'Space',
      re: /space|rocket|planet|orbit|moon|mars|asteroid|\bstar|ship|satellite|lunar|galax|interstellar|cosmic|venus|jupiter|saturn|comet|astro/i,
      physics: [65, 92], tech: [25, 55], market: [40, 70], capital: [5, 25],
      enablers: ['Starship cutting launch costs by 10x', 'rideshare launches for small payloads', 'reusable rockets', 'NASA buying services instead of building'],
      comps: ['SpaceX', 'Rocket Lab', 'Planet', 'Varda'], audiences: ['satellite operators', 'NASA', 'space tourists', 'mining companies'],
      models: ['Launch-as-a-service', 'Government contracts plus a few billionaires', 'Data subscriptions from orbit'],
      risks: ['Rockets explode.', 'Space is very big and very empty.', 'Insurance quotes.', 'Elon already announced it.'],
      customers: ['NASA', 'A Japanese billionaire', 'A satellite internet company'] },
    { id: 'transport', label: 'Mobility',
      re: /\bcar\b|vehicle|flying|train|road|aircraft|plane|boat|submarine|tube|elevator|travel|transport|airship|glider|sled|cycle|walkway|highway|taxi|bus\b/i,
      physics: [85, 98], tech: [45, 75], market: [70, 92], capital: [15, 40],
      enablers: ['robotaxis running in a dozen cities', 'eVTOL air taxis getting certified', 'batteries finally cheap enough', 'self-driving stacks you can license'],
      comps: ['Uber', 'Waymo', 'Joby', 'Lime', 'Tesla'], audiences: ['commuters', 'cities', 'delivery fleets', 'tourists'],
      models: ['Per-ride pricing', 'Fleet sales to cities', 'Subscription mobility'],
      risks: ['Crash testing.', 'City permits.', 'Everyone hates being early adopters of moving things.', 'Hardware margins.'],
      customers: ['Dubai', 'An airport', 'A last-mile delivery fleet'] },
    { id: 'security', label: 'Security & surveillance',
      re: /surveil|spy|track|monitor|lie.?detect|identif|lock|police|crime|prison|detect|scan|sensor|alarm|truth/i,
      physics: [92, 100], tech: [68, 90], market: [60, 85], capital: [45, 75],
      enablers: ['computer vision that runs on a $5 chip', 'everyone already wearing sensors', 'AI that reads tone and faces', 'cheap lidar'],
      comps: ['Flock', 'Ring', 'Verkada', 'Palantir'], audiences: ['landlords', 'retail stores', 'parents', 'banks'],
      models: ['Hardware plus a monitoring subscription', 'Enterprise licenses', 'Per-camera pricing'],
      risks: ['It is 1984 and you are the bad guy.', 'Privacy laws in the EU.', 'Bad press, permanently.', 'False positives.'],
      customers: ['A chain of convenience stores', 'A bank', 'A school district'] },
    { id: 'society', label: 'Fintech & society',
      re: /money|currenc|credit|bank|market|econom|\blaw\b|govern|vote|advert|social|class|caste|job|work|lottery|insur|tax|contract|propaganda|religion|church/i,
      physics: [98, 100], tech: [72, 92], market: [60, 85], capital: [65, 90],
      enablers: ['stablecoins going mainstream', 'AI agents that can move money', 'instant payment rails', 'everyone living inside an app anyway'],
      comps: ['Stripe', 'Robinhood', 'Venmo', 'Coinbase', 'Kalshi'], audiences: ['freelancers', 'Gen Z investors', 'small landlords', 'governments'],
      models: ['Take rate on every transaction', 'Interchange fees', 'Premium membership'],
      risks: ['The SEC.', 'You accidentally built a dystopia.', 'Fraud.', 'Banks will not give you an account.'],
      customers: ['Gig workers', 'A small country', 'Crypto Twitter'] },
    { id: 'home', label: 'Consumer goods',
      re: /food|eat|meal|drink|kitchen|house|home|furnitur|\bbed\b|cloth|fabric|garment|suit|wear|shoe|toy|pet|cook|bath|chair|tool|glove|helmet|mask|beverage|cigar|drug store/i,
      physics: [88, 100], tech: [55, 82], market: [70, 92], capital: [40, 72],
      enablers: ['smart materials you can buy by the meter', 'precision fermentation', 'cheap actuators and sensors', 'TikTok Shop distribution'],
      comps: ['Peloton', 'Dyson', 'Impossible Foods', 'Nest', 'Allbirds'], audiences: ['millennials with disposable income', 'new parents', 'gym people', 'apartment dwellers'],
      models: ['Direct-to-consumer, sold on TikTok', 'Hardware plus refills', 'Retail at Target'],
      risks: ['Inventory.', 'Amazon knockoffs in six weeks.', 'Returns.', 'Customer acquisition costs.'],
      customers: ['A Brooklyn influencer', 'Costco', 'Every dorm room'] },
    { id: 'energy', label: 'Energy & materials',
      re: /energ|power|atomic|nuclear|solar|fuel|batter|reactor|metal|material|alloy|crystal|plastic|element|electric|heat|cold|freez|water|weather|climate|glass|steel|engine|motor/i,
      physics: [65, 92], tech: [30, 60], market: [65, 88], capital: [10, 35],
      enablers: ['fusion startups hitting real milestones', 'AI-discovered materials', 'grid batteries at scale', 'data centers desperate for power'],
      comps: ['Helion', 'Commonwealth Fusion', 'Tesla Energy', 'Form Energy'], audiences: ['utilities', 'data centers', 'factories', 'off-grid homes'],
      models: ['Power purchase agreements', 'Licensing the material', 'Selling to hyperscalers'],
      risks: ['Scaling from a lab bench to a factory.', 'Commodity prices.', 'Fusion is always 30 years away.', 'Permitting.'],
      customers: ['Microsoft data centers', 'A steel mill', 'The grid'] },
    { id: 'creature', label: 'Weird biology',
      re: /creature|alien|species|beast|animal|plant|bird|insect|monster|lifeform|life.form|being|race\b|people|worm|fish/i,
      physics: [40, 75], tech: [10, 35], market: [30, 60], capital: [10, 30],
      enablers: ['de-extinction labs', 'synthetic biology', 'gene drives', 'the James Webb telescope finding something weird'],
      comps: ['Colossal', 'Ginkgo Bioworks', 'SeaWorld', 'BarkBox'], audiences: ['zoos', 'exotic pet owners', 'researchers', 'Netflix'],
      models: ['Ticketed experiences', 'Licensing to zoos', 'Documentary rights'],
      risks: ['It escapes.', 'It eats the board.', 'Animal rights groups.', 'It is not technically real.'],
      customers: ['The San Diego Zoo', 'A Netflix documentary crew', 'A very brave lab'] }
  ];
  const GENERIC = { id: 'misc', label: 'Moonshot', re: /./,
    physics: [60, 90], tech: [30, 65], market: [50, 80], capital: [30, 65],
    enablers: ['cheap AI', 'cheap hardware prototyping', 'a decade of falling costs', 'the internet getting weird again'],
    comps: ['Apple', 'Airbnb', 'Dyson', 'Shopify'], audiences: ['early adopters', 'enterprises', 'hobbyists', 'everyone with a phone'],
    models: ['Subscription', 'Hardware plus software', 'Enterprise licensing'],
    risks: ['Nobody is sure what it does.', 'Explaining it.', 'Product-market fit.', 'The prototype.'],
    customers: ['A Fortune 500 innovation lab', 'A Kickstarter crowd', 'Your mom'] };

  const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'to', 'in', 'for', 'on', 'with', 'device', 'machine', 'system', 'ray', 'type', 'mark']);

  function classify(idea) {
    const text = [idea.name, idea.desc, idea.details, idea.product].join(' ');
    for (const c of CATS) if (c.re.test(text)) return c;
    return GENERIC;
  }

  function keyword(name, r) {
    const words = name.replace(/\(.*?\)/g, '').split(/[^A-Za-z]+/).filter(w => w.length > 2 && !STOP.has(w.toLowerCase()));
    if (!words.length) return (name.replace(/[^A-Za-z]/g, '') || 'Nova').slice(0, 8);
    // prefer the most distinctive (longest) word, with a little randomness
    words.sort((a, b) => b.length - a.length);
    return r() < 0.7 ? words[0] : pick(r, words);
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  function startupName(idea, r) {
    let w = cap(keyword(idea.name, r));
    if (w.length > 9) w = w.slice(0, 7).replace(/[aeiou]+$/i, '');
    const stem = w.replace(/[aeiouy]$/i, '');
    const forms = [
      () => stem + 'ly', () => stem + 'ify', () => w + '.ai', () => w + ' Labs', () => 'Get' + w,
      () => w + 'OS', () => 'Hyper' + w.toLowerCase(), () => w.replace(/[aeiou]/gi, (m, i) => (i === 0 ? m : '')).slice(0, 6) + 'r',
      () => w + ' Dynamics', () => 'Neo' + w.toLowerCase(), () => w + 'Works', () => 'Project ' + w,
      () => w + 'Hub', () => 'Open' + w, () => w + 'Stack', () => stem + 'io'
    ];
    return pick(r, forms)();
  }

  function sentence(s) {
    s = (s || '').trim().replace(/\.$/, '');
    if (!s) return '';
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  function money(m) { // m in $ millions
    if (m >= 1000) return '$' + (m / 1000).toFixed(m >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'B';
    return '$' + Math.round(m) + 'M';
  }

  function verdictFor(score, built) {
    if (built) return { tier: 'real', label: 'Already real', note: 'Someone shipped it. You are late, but you can still be better.' };
    if (score >= 80) return { tier: 'ship', label: 'Ship it this weekend', note: 'The parts exist. This is a hackathon project with a waitlist.' };
    if (score >= 65) return { tier: 'yc', label: 'YC-ready', note: 'Buildable today with a small team and a lot of coffee.' };
    if (score >= 45) return { tier: 'deep', label: 'Deep tech. Bring patience.', note: 'Possible, but you will need PhDs, money and years.' };
    if (score >= 25) return { tier: 'break', label: 'Needs a breakthrough', note: 'Science has to show up first. Start the lab, not the company.' };
    return { tier: 'no', label: 'Physics says no', note: 'Raise anyway. Investors love a long time horizon.' };
  }

  function analyze(raw) {
    const [id, year, name, novel, author, desc, built, who, product, first, details, bitsAtoms] = raw;
    const idea = { id, year, name, novel, author, desc, built, who, product, first, details, bitsAtoms };
    const r = rng(id * 7919 + 13);
    const cat = classify(idea);
    const isBuilt = built === 'Yes';
    const partial = built === 'Partial' || /prototype|concept|research|in development|partial/i.test(product + ' ' + details) && !/fictional/i.test(product);
    const roll = ([lo, hi]) => lo + r() * (hi - lo);

    let physics = roll(cat.physics), tech = roll(cat.tech), market = roll(cat.market), capital = roll(cat.capital);
    if (bitsAtoms === 'Bits') { tech += 8; capital += 15; physics += 5; }
    if (bitsAtoms === 'Atoms') { capital -= 5; }
    if (isBuilt) { physics = 100; tech = 88 + r() * 12; capital = Math.max(capital, 45); }
    else if (partial) { tech += 12; }
    physics = clamp(Math.round(physics), 1, 100); tech = clamp(Math.round(tech), 1, 100);
    market = clamp(Math.round(market), 1, 100); capital = clamp(Math.round(capital), 1, 100);

    let score = 0.35 * physics + 0.35 * tech + 0.15 * market + 0.15 * capital;
    if (isBuilt) score = Math.max(score, 90 + r() * 9);
    if (physics < 20) score = Math.min(score, 24);
    score = clamp(Math.round(score), 1, 99);
    const verdict = verdictFor(score, isBuilt);

    const sname = startupName(idea, r);
    const comp = pick(r, cat.comps), audience = pick(r, cat.audiences);
    const tagline = pick(r, [
      `${comp} for ${audience}.`,
      `It's ${comp}, but from ${year}.`,
      `${comp} meets ${pick(r, GENERIC.comps.concat(cat.comps).filter(c => c !== comp))}, for ${audience}.`,
      `The ${idea.name.replace(/\s*\(.*?\)/, '')} ${novel ? 'from ' + novel : ''}, finally real.`.replace(/\s+/g, ' ')
    ]);
    const what = sentence(desc) || `a real version of the ${idea.name}`;
    const whyNow = pick(r, cat.enablers);
    let pitch;
    const Desc = what.charAt(0).toUpperCase() + what.slice(1);
    if (isBuilt) {
      const generic = /^(prototype|product|concept|various|yes|partial)$/i.test(product);
      const builder = who ? who.charAt(0).toUpperCase() + who.slice(1) : 'Someone';
      pitch = `${author || 'A novelist'} imagined it in ${year}. ${builder} shipped it${product && !generic ? ' as ' + product : ''}${first ? ' (' + first + ')' : ''}. ${sname} makes it 10x better with ${whyNow}, starting with ${audience}.`;
    } else {
      pitch = `${Desc}. ${sname} builds it now, thanks to ${whyNow}. First customers: ${audience}.`;
    }

    // raise sizing
    let raise;
    if (score < 25) raise = 2000 + r() * 6000;
    else if (capital >= 60) raise = 2 + r() * 5;
    else if (capital >= 35) raise = 8 + r() * 20;
    else raise = 30 + r() * 120;
    raise = raise >= 1000 ? Math.round(raise / 100) * 100 : raise >= 20 ? Math.round(raise / 5) * 5 : Math.round(raise * 2) / 2;
    const round = score < 25 ? 'Pre-seed (ambitious)' : raise < 8 ? 'Seed' : raise < 40 ? 'Series A' : 'Series B';
    const post = raise * (score < 25 ? 3 : 8 + Math.round(r() * 8));
    const tamB = Math.exp(Math.log(0.3) + (market / 100) * Math.log(2000) * (0.6 + r() * 0.4));

    const waited = isBuilt && /^\d{4}/.test(first) ? parseInt(first, 10) - year : NOW - year;

    return {
      ...idea, isBuilt, category: cat.label, catId: cat.id,
      score, verdict, breakdown: { physics, tech, market, capital },
      startup: {
        name: sname, tagline, pitch,
        raise: money(raise), round, post: money(post), tam: money(tamB * 1000),
        model: pick(r, cat.models), risk: pick(r, cat.risks), customer: pick(r, cat.customers)
      },
      waited, waitedLabel: isBuilt ? (waited > 0 ? `Took ${waited} years to become real` : 'Real almost immediately') : `${waited} years and counting`
    };
  }

  const api = { analyze, NOW };
  if (typeof module !== 'undefined') module.exports = api; else root.Roulette = api;
})(this);
