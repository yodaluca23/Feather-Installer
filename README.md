# Feather Installer

A web-based tool to sign the [Feather iOS app](https://github.com/khcrysalis/Feather) (`.ipa`) with your own certificate and provisioning profile, using the [ipasign.cc](https://sign.ipasign.cc) service.

---

## Features

- Upload your `.p12` certificate and `.mobileprovision` provisioning profile.
- Enter your certificate password securely.
- Automatically downloads the latest Feather IPA from GitHub.
- Signs the IPA using your credentials via the [`ipasign.cc`](https://sign.ipasign.cc) API.
- Provides a direct install link (`itms-services://`) for your signed app.
- Generates a link to import your certificate into the Feather app (`feather://` scheme).
- **"Send to Phone"** button to copy an encrypted Catbox-hosted URL for mobile access.
- Optionally generate a **QR code** for quick device scanning.
- Responsive design with full dark mode support.

---

## Usage

1. Open the page in your browser.
2. Enter your certificate password.
3. Upload your `.p12` certificate file.
4. Upload your `.mobileprovision` file.
5. Click **🔏 Sign IPA**.
6. Wait for the signing process to complete.
7. Use the generated links to:
   - Install Feather on your iOS device.
   - Import your certificate directly into the Feather app.
   - Optionally send a secure link to your phone or scan a QR code.

---

## Dependencies

- [Tailwind CSS](https://tailwindcss.com) (via CDN)
- Signing API: [ipasign.cc](https://sign.ipasign.cc)
- IPA download proxy: [corsproxy.io](https://corsproxy.io)
- Optional temporary file hosting (for import link encryption): [catbox.moe](https://litterbox.catbox.moe)
- QR Code generation: [qrcode](https://github.com/soldair/node-qrcode)

---

## Security Notice

This tool sends your `.p12`, `.mobileprovision`, and password directly to [ipasign.cc](https://sign.ipasign.cc) in order to sign your IPA — this is required for the signing process to work. No certificate files are stored or uploaded anywhere else.

When using the **"Send to Phone"** or **QR Code** features:
- The certificate **import link is encrypted client-side** using AES before being uploaded as temporary storage (deleted after one hour) to [Catbox](https://litterbox.catbox.moe).
- The decryption password is only shared via the URL fragment (not stored anywhere).

> ⚠️ You should **only use this tool if you trust ipasign.cc** with your signing credentials. As with any third-party service handling Apple certificates, there is an inherent security risk.

---

## Development

- Clone or download the HTML file.
- Open `index.html` in any modern browser.
- The signing API is called at `https://ipa.ipasign.cc/sign`.
- Polling status is checked at `https://ipa.ipasign.cc/status/{task_id}`.
- The latest IPA is fetched from the [Feather GitHub Releases](https://github.com/khcrysalis/Feather/releases/latest).

---

## License

MIT License

---

## Author

[yodaluca23](https://github.com/yodaluca23)

---

## Links

- [GitHub Repository](https://github.com/yodaluca23/Feather-Installer)
- [ipasign.cc](https://sign.ipasign.cc)
- [Feather](https://github.com/khcrysalis/Feather)
- [CORS Proxy](https://corsproxy.io)
- [qrcode](https://github.com/soldair/node-qrcode)
