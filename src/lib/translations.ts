// Fumadocs and fumadocs-openapi print their labels in title case, and the style
// guide asks for sentence case. A key is the label's English text followed by
// its context in brackets, as listed in `.translations/keys.js` in each package
// (fumadocs-ui, fumadocs-openapi and the shared package inside it),
// and a value replaces the whole label. The OpenAPI anchors, such as
// `response-body`, are fixed in the package and do not follow the label.
export const translations: Record<string, string> = {
  // fumadocs-openapi: operation page
  'Cookie Parameters(operation page)': 'Cookie parameters',
  'Example Requests(operation page)': 'Example requests',
  'Header Parameters(operation page)': 'Header parameters',
  'Path Parameters(operation page)': 'Path parameters',
  'Query Parameters(operation page)': 'Query parameters',
  'Request Body(operation page)': 'Request body',
  'Response Body(operation page)': 'Response body',

  // fumadocs-openapi: playground
  'Add Item(playground)': 'Add item',
  'Enter Property Name(playground)': 'Enter property name',
  'Enter Value(playground server select)': 'Enter value',
  'Field Info(playground)': 'Field info',
  'New Item(playground)': 'New item',
  'Property Name(playground)': 'Property name',
  'Remove Item(playground)(aria-label)': 'Remove item',
  'Request Failed(playground result display)': 'Request failed',
  'Show Property(playground)': 'Show property',
  'Switch Field(playground)': 'Switch field',
  'Try in Playground(playground)': 'Try in playground',

  // fumadocs-openapi: schema tables
  'Copied Link(schema UI)(aria-label)': 'Copied link',
  'Copy Link(schema UI)(aria-label)': 'Copy link',
  'Filter Properties(schema UI)': 'Filter properties',
  'Multiple Of(schema UI)': 'Multiple of',
  'Show Path(schema UI)(aria-label)': 'Show path',

  // fumadocs-openapi: status names in the playground
  'Bad Gateway(playground status info)': 'Bad gateway',
  'Bad Request(playground status info)': 'Bad request',
  'Internal Server Error(playground status info)': 'Internal server error',
  'Method Not Allowed(playground status info)': 'Method not allowed',
  'Moved Permanently(playground status info)': 'Moved permanently',
  'No Content(playground status info)': 'No content',
  'Not Found(playground status info)': 'Not found',
  'Not Modified(playground status info)': 'Not modified',
  'Service Unavailable(playground status info)': 'Service unavailable',
  'Too Many Requests(playground status info)': 'Too many requests',
  'Unprocessable Content(playground status info)': 'Unprocessable content',

  // fumadocs-openapi: sign-in dialog
  'Client Credentials(OAuth dialog)': 'Client credentials',
  'Device Authorization(OAuth dialog)': 'Device authorization',
  'Resource Owner Password Flow(OAuth dialog)': 'Resource owner password flow',

  // fumadocs-ui
  'Back to Home(404 page)': 'Back to home',
  'Close Banner(banner)(aria-label)': 'Close banner',
  'Close Search(search dialog)(aria-label)': 'Close search',
  'Close Sidebar(aria-label)': 'Close sidebar',
  'Close Sidebar(sidebar)(aria-label)': 'Close sidebar',
  'Collapse Sidebar(sidebar)(aria-label)': 'Collapse sidebar',
  'Copied Anchor Link(heading anchor)(aria-label)': 'Copied anchor link',
  'Copied Link(accordion)(aria-label)': 'Copied link',
  'Copied Text(code block)(aria-label)': 'Copied text',
  'Copy Anchor Link(heading anchor)(aria-label)': 'Copy anchor link',
  'Copy Link(accordion)(aria-label)': 'Copy link',
  'Copy Text(code block)(aria-label)': 'Copy text',
  'Hide Sidebar(sidebar)': 'Hide sidebar',
  'Layout Tab(layout tab trigger)': 'Layout tab',
  'Next Page(pagination)': 'Next page',
  'No Headings(table of contents)': 'No headings',
  'Open Search(search trigger)(aria-label)': 'Open search',
  'Open Sidebar(sidebar)(aria-label)': 'Open sidebar',
  'Page Not Found(404 page)': 'Page not found',
  'Previous Page(pagination)': 'Previous page',
  'Show Sidebar(sidebar)': 'Show sidebar',
  'Table of Contents(inline table of contents)': 'Table of contents',
  'Toggle Menu(mobile menu)(aria-label)': 'Toggle menu',
  'Toggle Theme(theme switcher)(aria-label)': 'Toggle theme',
};
