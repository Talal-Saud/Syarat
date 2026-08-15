export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type Uuid = Brand<string, 'Uuid'>;
export type IsoDateTime = Brand<string, 'IsoDateTime'>;
