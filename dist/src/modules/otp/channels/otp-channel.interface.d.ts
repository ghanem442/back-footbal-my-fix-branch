export interface OtpChannel {
    send(recipient: string, code: string): Promise<void>;
}
