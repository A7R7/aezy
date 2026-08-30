# @aezy/layout

Browser-only, out-of-tree layout policy for Aezy's existing DSH AppFrame. It
does not replace the root frame, slots, Session selection, details open/close
service, responsive collapse, or panel contents. It intercepts only the public
details resize handle while the desktop details column is open.

The proportional split is calculated inside the region shared by conversation
and details after excluding the navigation sidebar:

- Chat minimum: 25%.
- Details maximum: 75%, which is greater than half of the shared region and,
  at the normal/collapsed Aezy sidebar widths, greater than half of the full
  frame.
- Details minimum: the existing 300px where the shared region permits it.
- Below 760px: no intervention; existing Aezy panel overlays remain authority.

If the expected AppFrame DOM or resize handle is unavailable, the policy does
nothing and DSH's default layout continues to operate.
