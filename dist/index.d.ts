export interface QuickBooksConfig {
    consumerKey: string;
    consumerSecret: string;
    token?: string;
    tokenSecret?: string;
    realmId: string;
    useSandbox?: boolean;
    debug?: boolean;
    minorversion?: number | string;
    oauthversion?: '1.0a' | '2.0';
    refreshToken?: string;
}
export declare class QuickBooks {
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
    realmId: string;
    useSandbox: boolean;
    debug: boolean;
    endpoint: string;
    minorversion: number | string;
    oauthversion: '1.0a' | '2.0';
    refreshToken: string | null;
    static APP_CENTER_BASE: string;
    static V3_ENDPOINT_BASE_URL: string;
    static TOKEN_URL: string;
    static REVOKE_URL: string;
    static USER_INFO_URL: string;
    constructor(consumerKeyOrConfig: string | QuickBooksConfig, consumerSecret?: string, token?: string, tokenSecret?: string | boolean, realmId?: string, useSandbox?: boolean, debug?: boolean, minorversion?: number | string, oauthversion?: '1.0a' | '2.0', refreshToken?: string);
    private request;
    private unwrap;
    private handleCallback;
    create(entityName: string, entity: any, callback?: any): Promise<any> | undefined;
    read(entityName: string, id: string, callback?: any): Promise<any> | undefined;
    update(entityName: string, entity: any, callback?: any): any;
    delete(entityName: string, idOrEntity: any, callback?: any): Promise<any> | undefined;
    query(entity: string, criteria: any, callback?: any): Promise<any> | undefined;
    report(reportType: string, criteria: any, callback?: any): Promise<any> | undefined;
    batch(items: any[], callback?: any): Promise<any> | undefined;
    changeDataCapture(entities: string[] | string, since: Date | string, callback?: any): Promise<any> | undefined;
    upload(filename: string, contentType: string, stream: any, entityType: string | any, entityId?: string, callback?: any): any;
    getUserInfo(callback?: any): Promise<any> | undefined;
    [key: string]: any;
}
export default QuickBooks;
