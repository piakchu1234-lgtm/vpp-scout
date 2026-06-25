// Council contact information lookup by LGA name
// Victorian councils with planning contact details

type CouncilContact = {
  name: string;
  website: string;
  planningPhone: string;
  planningEmail: string;
};

const COUNCIL_CONTACTS: Record<string, CouncilContact> = {
  // Melbourne Metro Councils
  'Melbourne': {
    name: 'City of Melbourne',
    website: 'www.melbourne.vic.gov.au',
    planningPhone: '(03) 9658 9658',
    planningEmail: 'planning@melbourne.vic.gov.au',
  },
  'Yarra': {
    name: 'City of Yarra',
    website: 'www.yarracity.vic.gov.au',
    planningPhone: '(03) 9205 5555',
    planningEmail: 'planning@yarracity.vic.gov.au',
  },
  'Port Phillip': {
    name: 'City of Port Phillip',
    website: 'www.portphillip.vic.gov.au',
    planningPhone: '(03) 9209 6777',
    planningEmail: 'planning@portphillip.vic.gov.au',
  },
  'Stonnington': {
    name: 'City of Stonnington',
    website: 'www.stonnington.vic.gov.au',
    planningPhone: '(03) 8290 1333',
    planningEmail: 'planning@stonnington.vic.gov.au',
  },
  'Boroondara': {
    name: 'City of Boroondara',
    website: 'www.boroondara.vic.gov.au',
    planningPhone: '(03) 9278 4444',
    planningEmail: 'planning@boroondara.vic.gov.au',
  },
  'Monash': {
    name: 'City of Monash',
    website: 'www.monash.vic.gov.au',
    planningPhone: '(03) 9518 3555',
    planningEmail: 'planning@monash.vic.gov.au',
  },
  'Glen Eira': {
    name: 'City of Glen Eira',
    website: 'www.gleneira.vic.gov.au',
    planningPhone: '(03) 9524 3333',
    planningEmail: 'mail@gleneira.vic.gov.au',
  },
  'Greater Dandenong': {
    name: 'City of Greater Dandenong',
    website: 'www.greaterdandenong.vic.gov.au',
    planningPhone: '(03) 8571 1000',
    planningEmail: 'planning@cgd.vic.gov.au',
  },
  'Whitehorse': {
    name: 'City of Whitehorse',
    website: 'www.whitehorse.vic.gov.au',
    planningPhone: '(03) 9262 6333',
    planningEmail: 'customerservice@whitehorse.vic.gov.au',
  },
  'Manningham': {
    name: 'Manningham City Council',
    website: 'www.manningham.vic.gov.au',
    planningPhone: '(03) 9840 9333',
    planningEmail: 'planning@manningham.vic.gov.au',
  },
  'Banyule': {
    name: 'City of Banyule',
    website: 'www.banyule.vic.gov.au',
    planningPhone: '(03) 9457 9944',
    planningEmail: 'planning@banyule.vic.gov.au',
  },
  'Darebin': {
    name: 'Darebin City Council',
    website: 'www.darebin.vic.gov.au',
    planningPhone: '(03) 8470 8888',
    planningEmail: 'planning@darebin.vic.gov.au',
  },
  'Moreland': {
    name: 'Moreland City Council',
    website: 'www.moreland.vic.gov.au',
    planningPhone: '(03) 9240 1111',
    planningEmail: 'planning@moreland.vic.gov.au',
  },
  'Moonee Valley': {
    name: 'Moonee Valley City Council',
    website: 'www.mvcc.vic.gov.au',
    planningPhone: '(03) 9243 8888',
    planningEmail: 'planning@mvcc.vic.gov.au',
  },
  'Maribyrnong': {
    name: 'Maribyrnong City Council',
    website: 'www.maribyrnong.vic.gov.au',
    planningPhone: '(03) 9688 0000',
    planningEmail: 'planning@maribyrnong.vic.gov.au',
  },
  'Hobsons Bay': {
    name: 'Hobsons Bay City Council',
    website: 'www.hobsonsbay.vic.gov.au',
    planningPhone: '(03) 9932 1000',
    planningEmail: 'customerservice@hobsonsbay.vic.gov.au',
  },
  'Bayside': {
    name: 'Bayside City Council',
    website: 'www.bayside.vic.gov.au',
    planningPhone: '(03) 9599 4444',
    planningEmail: 'bayside@bayside.vic.gov.au',
  },
  'Kingston': {
    name: 'City of Kingston',
    website: 'www.kingston.vic.gov.au',
    planningPhone: '1300 653 356',
    planningEmail: 'planning@kingston.vic.gov.au',
  },
  'Casey': {
    name: 'City of Casey',
    website: 'www.casey.vic.gov.au',
    planningPhone: '(03) 9705 5200',
    planningEmail: 'planning@casey.vic.gov.au',
  },
  'Cardinia': {
    name: 'Cardinia Shire Council',
    website: 'www.cardinia.vic.gov.au',
    planningPhone: '1300 787 624',
    planningEmail: 'planning@cardinia.vic.gov.au',
  },

  // Regional Victoria
  'Geelong': {
    name: 'City of Greater Geelong',
    website: 'www.geelongaustralia.com.au',
    planningPhone: '(03) 5272 5272',
    planningEmail: 'planning@geelongcity.vic.gov.au',
  },
  'Ballarat': {
    name: 'City of Ballarat',
    website: 'www.ballarat.vic.gov.au',
    planningPhone: '(03) 5320 5500',
    planningEmail: 'info@ballarat.vic.gov.au',
  },
  'Bendigo': {
    name: 'City of Greater Bendigo',
    website: 'www.bendigo.vic.gov.au',
    planningPhone: '(03) 5434 6000',
    planningEmail: 'info@bendigo.vic.gov.au',
  },
  'Surf Coast': {
    name: 'Surf Coast Shire',
    website: 'www.surfcoast.vic.gov.au',
    planningPhone: '(03) 5261 0600',
    planningEmail: 'planning@surfcoast.vic.gov.au',
  },
  'Mornington Peninsula': {
    name: 'Mornington Peninsula Shire',
    website: 'www.mornpen.vic.gov.au',
    planningPhone: '(03) 5950 1000',
    planningEmail: 'customerservice@mornpen.vic.gov.au',
  },
  'Frankston': {
    name: 'City of Frankston',
    website: 'www.frankston.vic.gov.au',
    planningPhone: '1300 322 322',
    planningEmail: 'info@frankston.vic.gov.au',
  },
  'Wyndham': {
    name: 'Wyndham City Council',
    website: 'www.wyndham.vic.gov.au',
    planningPhone: '(03) 9742 0777',
    planningEmail: 'mailbox@wyndham.vic.gov.au',
  },
  'Melton': {
    name: 'Melton City Council',
    website: 'www.melton.vic.gov.au',
    planningPhone: '(03) 9747 7200',
    planningEmail: 'objections@melton.vic.gov.au',
  },
  'Hume': {
    name: 'Hume City Council',
    website: 'www.hume.vic.gov.au',
    planningPhone: '(03) 9205 2200',
    planningEmail: 'customerservice@hume.vic.gov.au',
  },
  'Whittlesea': {
    name: 'City of Whittlesea',
    website: 'www.whittlesea.vic.gov.au',
    planningPhone: '(03) 9217 2170',
    planningEmail: 'planning@whittlesea.vic.gov.au',
  },
  'Nillumbik': {
    name: 'Nillumbik Shire Council',
    website: 'www.nillumbik.vic.gov.au',
    planningPhone: '(03) 9433 3111',
    planningEmail: 'nillumbik@nillumbik.vic.gov.au',
  },
  'Yarra Ranges': {
    name: 'Yarra Ranges Council',
    website: 'www.yarraranges.vic.gov.au',
    planningPhone: '1300 368 333',
    planningEmail: 'mailbox@yarraranges.vic.gov.au',
  },
  'Maroondah': {
    name: 'Maroondah City Council',
    website: 'www.maroondah.vic.gov.au',
    planningPhone: '(03) 9298 4598',
    planningEmail: 'planning@maroondah.vic.gov.au',
  },
  'Knox': {
    name: 'Knox City Council',
    website: 'www.knox.vic.gov.au',
    planningPhone: '(03) 9298 8000',
    planningEmail: 'knoxcc@knox.vic.gov.au',
  },
};

export function getCouncilContact(lgaName: string | null): CouncilContact | null {
  if (!lgaName) return null;

  // Normalize LGA name (remove "City of", "Shire of", etc.)
  const normalized = lgaName
    .replace(/^(City of|Shire of|Borough of|Rural City of)\s+/i, '')
    .trim();

  return COUNCIL_CONTACTS[normalized] || null;
}

export type { CouncilContact };
