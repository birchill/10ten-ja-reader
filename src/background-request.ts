import { isObject } from './is-object';

type RequestObject = {
  type: string;
} & Record<string, unknown>;

function isRequestObject(a: unknown): a is RequestObject {
  return isObject(a) && typeof a.type === 'string';
}

//
// Disabled request
//

export type DisabledRequest = {
  type: 'disabled';
};

export function isDisabledRequest(a: unknown): a is DisabledRequest {
  return isRequestObject(a) && a.type === 'disabled';
}

//
// Enable? request
//

export type EnableQueryRequest = {
  type: 'enable?';
};

export function isEnableQueryRequest(a: unknown): a is EnableQueryRequest {
  return isRequestObject(a) && a.type === 'enable?';
}

//
// Options request
//

export type OptionsRequest = { type: 'options' };

export function isOptionsRequest(a: unknown): a is OptionsRequest {
  return isRequestObject(a) && a.type === 'options';
}

//
// Report warning request
//

export type ReportWarningRequest = {
  type: 'reportWarning';
  message: string;
};

export function isReportWarningRequest(a: unknown): a is ReportWarningRequest {
  return (
    isRequestObject(a) &&
    a.type === 'reportWarning' &&
    typeof a.message === 'string'
  );
}

//
// Search request
//

export type SearchRequest = {
  type: 'search';
  input: string;
  includeRomaji?: boolean;
};

export function isSearchRequest(a: unknown): a is SearchRequest {
  if (!isRequestObject(a)) {
    return false;
  }

  if (a.type !== 'search') {
    return false;
  }

  if (typeof a.input !== 'string') {
    return false;
  }

  if (
    typeof a.includeRomaji !== 'undefined' &&
    typeof a.includeRomaji !== 'boolean'
  ) {
    return false;
  }

  return true;
}

//
// Switched dictionary request
//

export type SwitchedDictionaryRequest = {
  type: 'switchedDictionary';
};

export function isSwitchedDictionaryRequest(
  a: unknown
): a is SwitchedDictionaryRequest {
  return isRequestObject(a) && a.type === 'switchedDictionary';
}

//
// Translate request
//

export type TranslateRequest = {
  type: 'translate';
  input: string;
  includeRomaji?: boolean;
};

export function isTranslateRequest(a: unknown): a is TranslateRequest {
  if (!isRequestObject(a)) {
    return false;
  }

  if (a.type !== 'translate') {
    return false;
  }

  if (typeof a.input !== 'string') {
    return false;
  }

  if (
    typeof a.includeRomaji !== 'undefined' &&
    typeof a.includeRomaji !== 'boolean'
  ) {
    return false;
  }

  return true;
}

//
// Toggle definition request
//

export type ToggleDefinitionRequest = {
  type: 'toggleDefinition';
};

export function isToggleDefinitionRequest(
  a: unknown
): a is ToggleDefinitionRequest {
  return isRequestObject(a) && a.type === 'toggleDefinition';
}

//
// Background request
//

export type BackgroundRequest =
  | DisabledRequest
  | EnableQueryRequest
  | OptionsRequest
  | ReportWarningRequest
  | SearchRequest
  | SwitchedDictionaryRequest
  | TranslateRequest
  | ToggleDefinitionRequest;

export function isBackgroundRequest(a: unknown): a is BackgroundRequest {
  return (
    isDisabledRequest(a) ||
    isEnableQueryRequest(a) ||
    isOptionsRequest(a) ||
    isReportWarningRequest(a) ||
    isSwitchedDictionaryRequest(a) ||
    isSearchRequest(a) ||
    isTranslateRequest(a) ||
    isToggleDefinitionRequest(a)
  );
}
