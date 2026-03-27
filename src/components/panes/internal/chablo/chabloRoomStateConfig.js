function hashString(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickVariant(options, seed) {
  if (!Array.isArray(options) || options.length === 0) {
    return '';
  }
  return options[hashString(seed) % options.length];
}

const ROOM_STATE_FACTORIES_BY_HOTSPOT_ID = {
  Balie: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Receptie live',
    text: `${currentUser} checkt in bij de balie.`,
    detail: 'Het motelbord is weer even het centrum van de lobby.',
    kind: 'receptie',
    sceneEffect: 'lobby-board',
    sceneAccent: '#f0c97c',
    stageNote: 'Check-in live',
    stateBadge: 'Check-in',
    stateSummary: `${currentUser} houdt de balie even bezet.`,
    participantCount,
    participantLabel: 'Lobby aandacht',
    prompt: 'Vraag aan de balie wie er net is binnengevallen.',
    spotlight: pickVariant([
      'Kamer 12 vraagt extra handdoeken.',
      'De lobbybel blijft hangen.',
      'Er ligt een nieuw briefje op het motelbord.'
    ], `${currentUser}:${hotspot.id}:${actionType}`)
  }),
  Bartoog: ({ actionType, currentUser, hotspot, participantCount }) => {
    const special = pickVariant([
      'Neon Cola',
      'Pixel Sour',
      'After Hours Soda',
      'Lobby Sunset'
    ], `${currentUser}:${hotspot.id}:${actionType}`);

    return {
      title: 'Barstatus',
      text: `${currentUser} zet de toon aan de bar.`,
      detail: 'De kamer ruikt ineens naar pixelcocktails en halve gesprekken.',
      kind: 'bar',
      sceneEffect: 'bar-rush',
      sceneAccent: '#ff9468',
      stageNote: 'Last call',
      stateBadge: 'Bar live',
      stateSummary: `House special: ${special}.`,
      participantCount,
      participantLabel: 'Aan de bar',
      prompt: 'Drop de volgende bestelling in de room chat.',
      spotlight: `${currentUser} hangt aan de tap.`
    };
  },
  Dansvloer: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Dansvloer bezet',
    text: `${currentUser} claimt de dansvloer.`,
    detail: 'Zelfs stilstaan telt hier als performance.',
    kind: 'dance',
    sceneEffect: 'dance-floor',
    sceneAccent: '#ff78b2',
    stageNote: 'Floor claimed',
    stateBadge: 'Dansvloer',
    stateSummary: `${participantCount} avatar${participantCount === 1 ? '' : 's'} voelen de beat.`,
    participantCount,
    participantLabel: 'Op de vloer',
    prompt: 'De volgende die hier komt, claimt meteen een duet.',
    spotlight: pickVariant([
      'De tegellichten slaan roze uit.',
      'Iedereen doet alsof de DJ terug is.',
      'Zelfs stilstaan voelt hier luid.'
    ], `${currentUser}:${hotspot.id}:${actionType}`)
  }),
  Ketelruimte: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Ketelruimte actief',
    text: `${currentUser} luistert naar de brom van de leidingen.`,
    detail: 'De hele kelder klinkt alsof hij net iets belangrijks probeert te zeggen.',
    kind: 'utility',
    sceneEffect: 'boiler-hum',
    sceneAccent: '#8f9cff',
    stageNote: 'Onderhoud live',
    stateBadge: 'Onderhoud',
    stateSummary: 'De leidingen brommen harder dan daarnet.',
    participantCount,
    participantLabel: 'Beneden',
    prompt: 'Lees het log en beslis of dit normaal klinkt.',
    spotlight: pickVariant([
      'Een buis zingt in F mineur.',
      'De rechterlamp knippert weer.',
      'De vloer voelt warmer bij de ketel.'
    ], `${currentUser}:${hotspot.id}:${actionType}`)
  }),
  Whisperhoek: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Whisperhoek bezet',
    text: `${currentUser} trekt de kamer mee in fluistermodus.`,
    detail: 'Zelfs de lampen lijken automatisch zachter te praten.',
    kind: 'whisper',
    sceneEffect: 'whisper-mode',
    sceneAccent: '#a59cff',
    stageNote: 'Psst... live',
    stateBadge: 'Whisper',
    stateSummary: `Fluistermodus actief voor ${participantCount} motelziel${participantCount === 1 ? '' : 'en'}.`,
    participantCount,
    participantLabel: 'In de hoek',
    prompt: 'Alles wat je hier post, klinkt automatisch belangrijker.',
    spotlight: pickVariant([
      'De schaduwen kruipen iets dichterbij.',
      'Zelfs de neon praat zachter.',
      'De hoek absorbeert halve zinnen.'
    ], `${currentUser}:${hotspot.id}:${actionType}`)
  }),
  'Geparkeerde auto': ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Vertrekbord live',
    text: `${currentUser} bestudeert het vertrekbord bij de auto.`,
    detail: 'Iedereen doet alsof er straks echt iemand vertrekt.',
    kind: 'car',
    sceneEffect: 'parking-board',
    sceneAccent: '#bdf5d0',
    stageNote: 'Nog niet weg',
    stateBadge: 'Vertrekbord',
    stateSummary: 'De wagen staat nog altijd startklaar te knipperen.',
    participantCount,
    participantLabel: 'Buiten',
    prompt: 'Vraag wie zogezegd bijna vertrekt.',
    spotlight: pickVariant([
      'Koplampen weerkaatsen in de regenplas.',
      'De achterbank ligt vol halve plannen.',
      'Niemand weet of de sleutel echt in het contact zit.'
    ], `${currentUser}:${hotspot.id}:${actionType}`)
  }),
  Arcadekast: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Arcade live',
    text: `${currentUser} hangt aan de arcadekast.`,
    detail: 'De hele room doet ineens alsof highscores sociaal kapitaal zijn.',
    kind: 'arcade',
    sceneEffect: 'arcade-hype',
    sceneAccent: '#68d8ff',
    stageNote: 'High score',
    stateBadge: 'Arcade',
    stateSummary: pickVariant([
      'Highscore-jacht in volle gang.',
      'Iedereen kijkt zogezegd niet mee naar het scorebord.',
      'De kast piept alsof het persoonlijk wordt.'
    ], `${currentUser}:${hotspot.id}:${actionType}:summary`),
    participantCount,
    participantLabel: 'Bij de kasten',
    prompt: 'Roep in de chat wie hier zogezegd recordhouder is.',
    spotlight: pickVariant([
      'De attract-mode knippert harder dan nodig.',
      'Iemand mompelt dat het knopje links altijd hapert.',
      'De scoreteller lijkt één naam te verbergen.'
    ], `${currentUser}:${hotspot.id}:${actionType}:spot`)
  }),
  Kamerbord: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Gangbord live',
    text: `${currentUser} volgt het kamerbord met opvallend veel toewijding.`,
    detail: 'De gang voelt ineens alsof elke deur een eigen verhaallijn verbergt.',
    kind: 'hallway',
    sceneEffect: 'hallway-hum',
    sceneAccent: '#94a8ff',
    stageNote: 'Wayfinding',
    stateBadge: 'Gangbord',
    stateSummary: pickVariant([
      'Iemand zoekt zogezegd de juiste kamer.',
      'De pijl naar de kelder krijgt weer aandacht.',
      'Zelfs de deurlabels voelen ineens belangrijk.'
    ], `${currentUser}:${hotspot.id}:${actionType}:summary`),
    participantCount,
    participantLabel: 'In de gang',
    prompt: 'Vraag welke deur hier vanavond het meeste drama belooft.',
    spotlight: pickVariant([
      'Er hangt een nieuwe pijl naar nergens in het bijzonder.',
      'De arcadekant flikkert iets harder dan normaal.',
      'Iemand heeft een kamernummer onderstreept zonder uitleg.'
    ], `${currentUser}:${hotspot.id}:${actionType}:spot`)
  }),
  Sleutelrek: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Sleutelrek live',
    text: `${currentUser} rommelt aan het sleutelrek alsof daar antwoorden hangen.`,
    detail: 'Elke metalen tag klinkt ineens als een gerucht dat nog niet klaar is.',
    kind: 'hallway',
    sceneEffect: 'hallway-hum',
    sceneAccent: '#a7b7ff',
    stageNote: 'Keys out',
    stateBadge: 'Sleutels',
    stateSummary: pickVariant([
      'Er mist duidelijk weer een sleutel zonder uitleg.',
      'De tags tikken tegen elkaar bij elke tochtstroom.',
      'Niemand weet wie kamer 09 nog claimt.'
    ], `${currentUser}:${hotspot.id}:${actionType}:summary`),
    participantCount,
    participantLabel: 'Bij het rek',
    prompt: 'Perfect moment om te speculeren welke kamer straks openzwaait.',
    spotlight: pickVariant([
      'De sleutels rinkelen zonder dat iemand ze aanraakt.',
      'Een metalen tag draait traag terug naar stilstand.',
      'Er hangt een extra label zonder kamernummer.'
    ], `${currentUser}:${hotspot.id}:${actionType}:spot`)
  }),
  'Wardrobe spiegel': ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Wardrobe live',
    text: `${currentUser} checkt een nieuwe motel-look in de spiegel.`,
    detail: 'De gang voelt meteen iets persoonlijker zodra iemand aan zijn silhouette sleutelt.',
    kind: 'wardrobe',
    sceneEffect: 'hallway-hum',
    sceneAccent: '#caa5ff',
    stageNote: 'Fresh fit',
    stateBadge: 'Wardrobe',
    stateSummary: pickVariant([
      'Nieuwe shapes en kleuren krijgen ganglicht.',
      'De spiegel kaatst een compleet andere motelpersoonlijkheid terug.',
      'Zelfs de runner in de gang lijkt even mee te stylen.'
    ], `${currentUser}:${hotspot.id}:${actionType}:summary`),
    participantCount,
    participantLabel: 'Aan de spiegel',
    prompt: 'Perfect moment om je silhouette te wisselen voor de volgende roomrun.',
    spotlight: pickVariant([
      'De spiegel geeft de neon een zachtere gloed terug.',
      'Iemand past vijf vormen zonder iets te zeggen.',
      'Zelfs het sleutelrek kijkt even mee.'
    ], `${currentUser}:${hotspot.id}:${actionType}:spot`)
  }),
  Wasmachines: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Laundry live',
    text: `${currentUser} luistert naar de machines.`,
    detail: 'De hele laundry voelt even alsof hij op centrifuge draait.',
    kind: 'laundry',
    sceneEffect: 'laundry-spin',
    sceneAccent: '#8ed0ff',
    stageNote: 'Spin cycle',
    stateBadge: 'Laundry',
    stateSummary: pickVariant([
      'De machines bonken nu synchroon.',
      'Er draait weer een mysterieuze was zonder eigenaar.',
      'Iemand heeft duidelijk te veel detergent gebruikt.'
    ], `${currentUser}:${hotspot.id}:${actionType}:summary`),
    participantCount,
    participantLabel: 'Bij de was',
    prompt: 'Vraag in de chat van wie die ene losse sok is.',
    spotlight: pickVariant([
      'Er schuift een muntje onder een machine vandaan.',
      'De trommel bromt harder dan de ventilatie.',
      'De vloer trilt net genoeg om gezellig te voelen.'
    ], `${currentUser}:${hotspot.id}:${actionType}:spot`)
  }),
  Rokersrand: ({ actionType, currentUser, hotspot, participantCount }) => ({
    title: 'Rokersrand live',
    text: `${currentUser} hangt aan de rand van de parking.`,
    detail: 'Daar waar elk laatste gesprek nog één ronde extra krijgt.',
    kind: 'parking',
    sceneEffect: 'smoke-break',
    sceneAccent: '#a6f4d2',
    stageNote: 'Laatste praat',
    stateBadge: 'Smoke break',
    stateSummary: `${participantCount} avatar${participantCount === 1 ? '' : 's'} rekken het afscheid.`,
    participantCount,
    participantLabel: 'Aan de rand',
    prompt: 'Perfect voor een laatste zin die toch nog doorgaat.',
    spotlight: pickVariant([
      'De lucht ruikt naar regen en uitstel.',
      'Iemand lacht net buiten beeld.',
      'De parkingrand krijgt weer een extra ronde.'
    ], `${currentUser}:${hotspot.id}:${actionType}`)
  })
};

export function buildSharedRoomStatePayload(hotspot, actionType, currentUser, context = {}) {
  const participantCount = Math.max(1, Number(context.participantCount) || 1);
  const handler = ROOM_STATE_FACTORIES_BY_HOTSPOT_ID[hotspot?.id]
    || ROOM_STATE_FACTORIES_BY_HOTSPOT_ID[hotspot?.label]
    || ROOM_STATE_FACTORIES_BY_HOTSPOT_ID[hotspot?.kind];
  if (handler) {
    return handler({
      actionType,
      currentUser,
      hotspot,
      participantCount
    });
  }

  const lowerLabel = hotspot?.label?.toLowerCase?.() || hotspot?.id || 'hotspot';
  return {
    title: hotspot?.label || hotspot?.id || 'Hotspot',
    text: `${currentUser} activeert ${lowerLabel}.`,
    detail: hotspot?.action?.text || hotspot?.feedback || hotspot?.description || '',
    kind: actionType || hotspot?.kind || 'status',
    sceneEffect: 'generic',
    sceneAccent: hotspot?.accent || null,
    stageNote: hotspot?.kind || actionType || 'live',
    stateBadge: 'Live',
    stateSummary: hotspot?.description || `${currentUser} zet ${lowerLabel} in beweging.`,
    participantCount,
    participantLabel: 'In de buurt',
    prompt: hotspot?.feedback || '',
    spotlight: hotspot?.action?.text || hotspot?.description || ''
  };
}
