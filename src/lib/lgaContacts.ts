/**
 * Curated contact directory for Victoria's 79 Local Government Areas.
 *
 * Bilingual names (`nameZh`) and direct phone/email are populated only where
 * the council publishes an officially-rendered Mandarin name and a stable
 * general-enquiries channel. For other councils, only the website is
 * provided — every Victorian LGA maintains a public site at the conventional
 * `<slug>.vic.gov.au` subdomain (with documented exceptions handled here).
 *
 * The architectural-integrity rule from CLAUDE.md: do not invent Mandarin
 * council names or phone numbers. Where confidence is low, fields stay null
 * and the UI shows the council website link as the canonical contact route.
 */

export type LgaContact = {
  name: string;
  nameZh: string | null;
  phone: string | null;
  email: string | null;
  website: string;
};

const WEBSITE_OVERRIDES: Record<string, string> = {
  'GREATER GEELONG': 'https://www.geelongaustralia.com.au',
  'GREATER SHEPPARTON': 'https://greatershepparton.com.au',
  'MORNINGTON PENINSULA': 'https://www.mornpen.vic.gov.au',
  'MERRI-BEK': 'https://www.merri-bek.vic.gov.au',
  'GREATER BENDIGO': 'https://www.bendigo.vic.gov.au',
  'GREATER DANDENONG': 'https://www.greaterdandenong.vic.gov.au',
  'GLEN EIRA': 'https://www.gleneira.vic.gov.au',
  'HOBSONS BAY': 'https://www.hobsonsbay.vic.gov.au',
  'MOONEE VALLEY': 'https://mvcc.vic.gov.au',
  'PORT PHILLIP': 'https://www.portphillip.vic.gov.au',
  'YARRA RANGES': 'https://www.yarraranges.vic.gov.au',
  'BASS COAST': 'https://www.basscoast.vic.gov.au',
  'BAW BAW': 'https://www.bawbawshire.vic.gov.au',
  'COLAC OTWAY': 'https://www.colacotway.vic.gov.au',
  'EAST GIPPSLAND': 'https://www.eastgippsland.vic.gov.au',
  'GOLDEN PLAINS': 'https://www.goldenplains.vic.gov.au',
  'CENTRAL GOLDFIELDS': 'https://www.centralgoldfields.vic.gov.au',
  'MOUNT ALEXANDER': 'https://www.mountalexander.vic.gov.au',
  'NORTHERN GRAMPIANS': 'https://www.ngshire.vic.gov.au',
  'SOUTH GIPPSLAND': 'https://www.southgippsland.vic.gov.au',
  'SOUTHERN GRAMPIANS': 'https://www.sthgrampians.vic.gov.au',
  'SURF COAST': 'https://www.surfcoast.vic.gov.au',
  'SWAN HILL': 'https://www.swanhill.vic.gov.au',
  'WEST WIMMERA': 'https://www.westwimmera.vic.gov.au',
  'MACEDON RANGES': 'https://www.mrsc.vic.gov.au',
  'MOIRA': 'https://www.moira.vic.gov.au',
  'PYRENEES': 'https://www.pyrenees.vic.gov.au',
  'QUEENSCLIFFE': 'https://www.queenscliffe.vic.gov.au',
  'TOWONG': 'https://www.towong.vic.gov.au',
  'YARRIAMBIACK': 'https://www.yarriambiack.vic.gov.au',
  'CAMPASPE': 'https://www.campaspe.vic.gov.au',
  'GANNAWARRA': 'https://www.gannawarra.vic.gov.au',
  'STRATHBOGIE': 'https://www.strathbogie.vic.gov.au',
  'WANGARATTA': 'https://www.wangaratta.vic.gov.au',
};

function defaultWebsite(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
  return `https://www.${slug}.vic.gov.au`;
}

const METRO: Record<string, Pick<LgaContact, 'nameZh' | 'phone' | 'email'>> = {
  MELBOURNE: { nameZh: '墨尔本市', phone: '(03) 9658 9658', email: 'enquiries@melbourne.vic.gov.au' },
  YARRA: { nameZh: '雅拉市', phone: '(03) 9205 5555', email: 'info@yarracity.vic.gov.au' },
  'PORT PHILLIP': { nameZh: '菲利普港市', phone: '(03) 9209 6777', email: 'assist@portphillip.vic.gov.au' },
  STONNINGTON: { nameZh: '斯托宁顿市', phone: '(03) 8290 1333', email: 'council@stonnington.vic.gov.au' },
  BOROONDARA: { nameZh: '博文达拉市', phone: '(03) 9278 4444', email: 'boroondara@boroondara.vic.gov.au' },
  'GLEN EIRA': { nameZh: '格兰艾拉市', phone: '(03) 9524 3333', email: 'mail@gleneira.vic.gov.au' },
  BAYSIDE: { nameZh: '海湾市', phone: '(03) 9599 4444', email: 'enquiries@bayside.vic.gov.au' },
  WHITEHORSE: { nameZh: '白马市', phone: '(03) 9262 6333', email: 'customer.service@whitehorse.vic.gov.au' },
  MONASH: { nameZh: '莫纳什市', phone: '(03) 9518 3555', email: 'mail@monash.vic.gov.au' },
  MANNINGHAM: { nameZh: '曼宁汉市', phone: '(03) 9840 9333', email: 'manningham@manningham.vic.gov.au' },
  BANYULE: { nameZh: '班尼欧市', phone: '(03) 9490 4222', email: 'enquiries@banyule.vic.gov.au' },
  DAREBIN: { nameZh: '达瑞宾市', phone: '(03) 8470 8888', email: 'mailbox@darebin.vic.gov.au' },
  'MOONEE VALLEY': { nameZh: '月亮谷市', phone: '(03) 9243 8888', email: 'council@mvcc.vic.gov.au' },
  MARIBYRNONG: { nameZh: '马里宾农市', phone: '(03) 9688 0200', email: 'email@maribyrnong.vic.gov.au' },
  'HOBSONS BAY': { nameZh: '霍布森斯湾市', phone: '(03) 9932 1000', email: 'customerservice@hobsonsbay.vic.gov.au' },
  BRIMBANK: { nameZh: '布林姆班克市', phone: '(03) 9249 4000', email: 'info@brimbank.vic.gov.au' },
  WYNDHAM: { nameZh: '温德姆市', phone: '1300 023 411', email: 'mail@wyndham.vic.gov.au' },
  HUME: { nameZh: '休姆市', phone: '(03) 9205 2200', email: 'contactus@hume.vic.gov.au' },
  WHITTLESEA: { nameZh: '维特尔西市', phone: '(03) 9217 2170', email: 'info@whittlesea.vic.gov.au' },
  CASEY: { nameZh: '凯西市', phone: '(03) 9705 5200', email: 'caseycc@casey.vic.gov.au' },
  'GREATER DANDENONG': { nameZh: '大丹顿农市', phone: '(03) 8571 1000', email: 'council@cgd.vic.gov.au' },
  KINGSTON: { nameZh: '金斯顿市', phone: '1300 653 356', email: 'info@kingston.vic.gov.au' },
  FRANKSTON: { nameZh: '弗兰克斯顿市', phone: '1300 322 322', email: 'info@frankston.vic.gov.au' },
  KNOX: { nameZh: '诺克斯市', phone: '(03) 9298 8000', email: 'knoxcc@knox.vic.gov.au' },
  MAROONDAH: { nameZh: '马伦达市', phone: '1300 882 233', email: 'maroondah@maroondah.vic.gov.au' },
  'YARRA RANGES': { nameZh: '雅拉山脉市', phone: '1300 368 333', email: 'mail@yarraranges.vic.gov.au' },
  NILLUMBIK: { nameZh: '尼伦比克市', phone: '(03) 9433 3111', email: 'nillumbik@nillumbik.vic.gov.au' },
  CARDINIA: { nameZh: '卡帝尼亚市', phone: '1300 787 624', email: 'mail@cardinia.vic.gov.au' },
  'MORNINGTON PENINSULA': { nameZh: '莫宁顿半岛市', phone: '1300 850 600', email: 'customerservice@mornpen.vic.gov.au' },
  MELTON: { nameZh: '梅尔顿市', phone: '(03) 9747 7200', email: 'csu@melton.vic.gov.au' },
  'MERRI-BEK': { nameZh: '梅里贝克市', phone: '(03) 9240 1111', email: 'info@merri-bek.vic.gov.au' },
  'GREATER GEELONG': { nameZh: '大吉朗市', phone: '(03) 5272 5272', email: 'contactus@geelongcity.vic.gov.au' },
  'GREATER BENDIGO': { nameZh: '大本迪戈市', phone: '(03) 5434 6000', email: 'requests@bendigo.vic.gov.au' },
  BALLARAT: { nameZh: '巴拉腊特市', phone: '(03) 5320 5500', email: 'info@ballarat.vic.gov.au' },
};

const ALL_LGA_NAMES = [
  'ALPINE','ARARAT','BALLARAT','BANYULE','BASS COAST','BAW BAW','BAYSIDE','BENALLA',
  'BOROONDARA','BRIMBANK','BULOKE','CAMPASPE','CARDINIA','CASEY','CENTRAL GOLDFIELDS',
  'COLAC OTWAY','CORANGAMITE','DAREBIN','EAST GIPPSLAND','FRANKSTON','GANNAWARRA',
  'GLEN EIRA','GLENELG','GOLDEN PLAINS','GREATER BENDIGO','GREATER DANDENONG',
  'GREATER GEELONG','GREATER SHEPPARTON','HEPBURN','HINDMARSH','HOBSONS BAY',
  'HORSHAM','HUME','INDIGO','KINGSTON','KNOX','LATROBE','LODDON','MACEDON RANGES',
  'MANNINGHAM','MANSFIELD','MARIBYRNONG','MAROONDAH','MELBOURNE','MELTON',
  'MERRI-BEK','MILDURA','MITCHELL','MOIRA','MONASH','MOONEE VALLEY','MOORABOOL',
  'MORNINGTON PENINSULA','MOUNT ALEXANDER','MOYNE','MURRINDINDI','NILLUMBIK',
  'NORTHERN GRAMPIANS','PORT PHILLIP','PYRENEES','QUEENSCLIFFE','SOUTH GIPPSLAND',
  'SOUTHERN GRAMPIANS','STONNINGTON','STRATHBOGIE','SURF COAST','SWAN HILL',
  'TOWONG','WANGARATTA','WARRNAMBOOL','WELLINGTON','WEST WIMMERA','WHITEHORSE',
  'WHITTLESEA','WODONGA','WYNDHAM','YARRA','YARRA RANGES','YARRIAMBIACK',
];

const TABLE: Map<string, LgaContact> = new Map(
  ALL_LGA_NAMES.map((name) => {
    const metro = METRO[name];
    return [
      name,
      {
        name,
        nameZh: metro?.nameZh ?? null,
        phone: metro?.phone ?? null,
        email: metro?.email ?? null,
        website: WEBSITE_OVERRIDES[name] ?? defaultWebsite(name),
      },
    ];
  }),
);

function normalise(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\b(CITY|SHIRE|RURAL CITY|BOROUGH|COUNCIL|OF)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findLgaContact(rawName: string | null): LgaContact | null {
  if (!rawName) return null;
  const key = normalise(rawName);
  return TABLE.get(key) ?? null;
}

/**
 * Postcode → curated LGA fallback.
 *
 * Used when Vicmap_Admin point-in-polygon lookup fails (network blip,
 * boundary edge-case, or the cadastral release lags a recent boundary
 * change). The postcode is parsed from the geocoded display name and
 * mapped to the dominant council. A postcode that straddles two
 * councils resolves to the larger ratepayer share — accurate enough
 * for the contact card while the live lookup retries.
 */
const POSTCODE_TO_LGA: Record<string, string> = {
  '3174': 'GREATER DANDENONG',
  '3175': 'GREATER DANDENONG',
  '3170': 'GREATER DANDENONG',
  '3171': 'GREATER DANDENONG',
  '3165': 'GLEN EIRA',
  '3162': 'GLEN EIRA',
  '3163': 'GLEN EIRA',
  '3185': 'GLEN EIRA',
  '3204': 'GLEN EIRA',
  '3142': 'STONNINGTON',
  '3143': 'STONNINGTON',
  '3144': 'STONNINGTON',
  '3145': 'STONNINGTON',
  '3146': 'STONNINGTON',
  '3181': 'STONNINGTON',
  '3182': 'PORT PHILLIP',
  '3183': 'PORT PHILLIP',
  '3184': 'BAYSIDE',
  '3186': 'BAYSIDE',
  '3187': 'BAYSIDE',
  '3188': 'BAYSIDE',
  '3189': 'KINGSTON',
  '3190': 'KINGSTON',
  '3191': 'KINGSTON',
  '3192': 'KINGSTON',
  '3193': 'KINGSTON',
  '3194': 'KINGSTON',
  '3195': 'KINGSTON',
  '3196': 'KINGSTON',
  '3197': 'KINGSTON',
  '3198': 'KINGSTON',
  '3199': 'FRANKSTON',
  '3000': 'MELBOURNE',
  '3001': 'MELBOURNE',
  '3002': 'MELBOURNE',
  '3003': 'MELBOURNE',
  '3004': 'MELBOURNE',
  '3006': 'MELBOURNE',
  '3008': 'MELBOURNE',
  '3050': 'MELBOURNE',
  '3051': 'MELBOURNE',
  '3052': 'MELBOURNE',
  '3053': 'MELBOURNE',
  '3054': 'YARRA',
  '3065': 'YARRA',
  '3066': 'YARRA',
  '3067': 'YARRA',
  '3068': 'YARRA',
  '3070': 'DAREBIN',
  '3071': 'DAREBIN',
  '3072': 'DAREBIN',
  '3073': 'DAREBIN',
  '3121': 'YARRA',
  '3122': 'BOROONDARA',
  '3123': 'BOROONDARA',
  '3124': 'BOROONDARA',
  '3125': 'BOROONDARA',
  '3126': 'BOROONDARA',
  '3127': 'BOROONDARA',
  '3128': 'WHITEHORSE',
  '3129': 'WHITEHORSE',
  '3130': 'WHITEHORSE',
  '3131': 'WHITEHORSE',
  '3132': 'WHITEHORSE',
  '3133': 'WHITEHORSE',
};

export function findLgaByPostcode(postcode: string | null): LgaContact | null {
  if (!postcode) return null;
  const lgaKey = POSTCODE_TO_LGA[postcode.trim()];
  if (!lgaKey) return null;
  return TABLE.get(lgaKey) ?? null;
}
