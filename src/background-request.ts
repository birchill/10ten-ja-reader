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
  prevDict?: DictType;
  preferNames?: boolean;
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

  if (typeof a.prevDict !== 'undefined' && !isDictType(a.prevDict)) {
    return false;
  }

  if (
    typeof a.preferNames !== 'undefined' &&
    typeof a.preferNames !== 'boolean'
  ) {
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

export type DictType = 'words' | 'kanji' | 'names';

export function isDictType(a: unknown): a is DictType {
  return typeof a === 'string' && ['words', 'kanji', 'names'].includes(a);
}

//
// Translate request
//

export type TranslateRequest = {
  type: 'translate';
  title: string;
  includeRomaji?: boolean;
};

export function isTranslateRequest(a: unknown): a is TranslateRequest {
  if (!isRequestObject(a)) {
    return false;
  }

  if (a.type !== 'translate') {
    return false;
  }

  if (typeof a.title !== 'string') {
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
// Togggle definition request
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
  | ReportWarningRequest
  | SearchRequest
  | TranslateRequest
  | ToggleDefinitionRequest;

export function isBackgroundRequest(a: unknown): a is BackgroundRequest {
  return (
    isDisabledRequest(a) ||
    isEnableQueryRequest(a) ||
    isReportWarningRequest(a) ||
    isSearchRequest(a) ||
    isTranslateRequest(a) ||
    isToggleDefinitionRequest(a)
  );
}
