// How the tab stacks' screens come in. A screen opened from a menu, a card or
// a button slides in from the right, as a new screen does. A section chip -
// Overview, Payments, Ledger - only changes what the same screen shows, so the
// screen it switches to appears in place, as a tab does, rather than sliding.

/** What a section chip adds to the route it switches to. */
export const SECTION_SWITCH = { via: 'chip' } as const;

/** The tab stacks' screenOptions: no slide for a section switch, the usual slide for everything else. */
export const tabStackOptions = ({ route }: { route: { params?: object } }) => ({
  headerShown: false,
  animation: (route.params as { via?: string } | undefined)?.via === SECTION_SWITCH.via ? ('none' as const) : ('slide_from_right' as const),
});
