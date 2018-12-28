declare namespace NodeJS {
  export interface Global {
    browser: any;
    REF_ABBREVIATIONS: Array<{ abbrev: string; name: string }>;
  }
}
