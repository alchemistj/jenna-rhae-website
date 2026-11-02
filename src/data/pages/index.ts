import type { PageData } from "../types";
import home from "./home";
import trauma from "./trauma-recovery-coaching";
import kansasCity from "./christian-life-coach-kansas-city-mo";
import contact from "./contact";
import { privacy, terms, textMessagingTerms } from "./legal";

/** Every built page, keyed by path. Add a page's data here when its route stops being pending. */
export const pages: Record<string, PageData> = {
  [home.path]: home,
  [trauma.path]: trauma,
  [kansasCity.path]: kansasCity,
  [contact.path]: contact,
  [privacy.path]: privacy,
  [terms.path]: terms,
  [textMessagingTerms.path]: textMessagingTerms,
};

export {
  home,
  trauma,
  kansasCity,
  contact,
  privacy,
  terms,
  textMessagingTerms,
};
