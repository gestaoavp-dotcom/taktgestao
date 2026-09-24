// Set once a visitor has left their contact on /contato. The public tools
// (the Calculadora TAKT) open only for someone holding it.
//
// It gates marketing content, not data: it holds nothing but the lead's id
// and grants no access to anything in the database.
export const LEAD_COOKIE = "takt_lead";
