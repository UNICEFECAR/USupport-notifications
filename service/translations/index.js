import en from "./en.js";

const translations = {
  en,
};

/**
 *
 * @param {string} key the key of the translation
 * @param {string} language the alpha2 code of the language
 * @param {Array} params the parameters to be inserted into the translation
 * @returns {string} the translated string
 */
export const t = (key, language = "en", params = []) => {
  let translation = undefined;

  // Make sure the language exists and if not return the default language
  if (!Object.keys(translations).includes(language)) {
    translation = translations["en"][key];
  } else {
    translation = translations[language][key];
  }

  if (translation) {
    params.forEach((param, index) => {
      translation = translation.replace(`{${index + 1}}`, param);
    });
  } else {
    translation = translations["en"][key];
  }

  return translation;
};
