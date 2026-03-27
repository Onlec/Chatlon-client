import { buildSharedRoomStatePayload } from './chabloRoomStateConfig';

describe('chabloRoomStateConfig', () => {
  test('returns the expected themed payload for a known hotspot id', () => {
    const payload = buildSharedRoomStatePayload(
      {
        id: 'Balie',
        kind: 'receptie',
        label: 'Balie'
      },
      'bulletin',
      'alice',
      { participantCount: 3 }
    );

    expect(payload).toEqual(expect.objectContaining({
      title: 'Receptie live',
      kind: 'receptie',
      sceneEffect: 'lobby-board',
      sceneAccent: '#f0c97c',
      stageNote: 'Check-in live',
      stateBadge: 'Check-in',
      participantCount: 3,
      participantLabel: 'Lobby aandacht'
    }));
  });

  test('falls back to hotspot label before generic handling', () => {
    const payload = buildSharedRoomStatePayload(
      {
        id: 'Bar',
        kind: 'bar',
        label: 'Bartoog'
      },
      'prefill-chat',
      'alice',
      { participantCount: 1 }
    );

    expect(payload).toEqual(expect.objectContaining({
      title: 'Barstatus',
      sceneEffect: 'bar-rush',
      stateBadge: 'Bar live',
      participantLabel: 'Aan de bar'
    }));
  });

  test('returns a generic payload for unknown hotspots', () => {
    const payload = buildSharedRoomStatePayload(
      {
        id: 'mystery-hotspot',
        kind: 'oddity',
        label: 'Mysteriehoek',
        description: 'Onverklaarbaar levendig.',
        feedback: 'Er gebeurt iets raars.'
      },
      'feedback',
      'alice',
      { participantCount: 2 }
    );

    expect(payload).toEqual(expect.objectContaining({
      title: 'Mysteriehoek',
      kind: 'feedback',
      sceneEffect: 'generic',
      participantCount: 2,
      participantLabel: 'In de buurt',
      stateSummary: 'Onverklaarbaar levendig.',
      prompt: 'Er gebeurt iets raars.'
    }));
  });
});
