# Feather Installer

A web-based tool to sign the [Feather iOS app](https://github.com/khcrysalis/Feather) (`.ipa`) with your own certificate and provisioning profile, using the [ipasign.cc](https://sign.ipasign.cc) service.

---

## Features

- Upload your `.p12` certificate and `.mobileprovision` profile.
- Enter the certificate password.
- Automatically downloads the latest Feather IPA from GitHub.
- Signs the IPA with your credentials via the [`ipasign.cc`](https://sign.ipasign.cc) API.
- Provides direct install link for your signed app.
- Provides a link to import your certificate into the Feather app.
- "Send to Phone" button to copy a custom URL scheme for quick installation.
- Dark mode support and responsive design.

---

## Usage

1. Open the page in your browser.
2. Enter your certificate password.
3. Upload your `.p12` certificate file.
4. Upload your `.mobileprovision` file.
5. Click **🔏 Sign IPA**.
6. Wait for the signing process to complete.
7. Use the generated links to install Feather and import your certificate.

---

## Dependencies

- [Tailwind CSS](https://tailwindcss.com) (via CDN)
- Signing API: [ipasign.cc](https://sign.ipasign.cc)
- IPA download proxy: [corsproxy.io](https://corsproxy.io)

---

## Security Notice

This tool uses a third-party service to sign and deliver your IPA. **Only proceed if you trust** [`ipasign.cc`](https://sign.ipasign.cc) with your certificate and provisioning profile.

---

## Development

- Clone or download the HTML file.
- Open `index.html` in a modern browser.
- The signing API is called at `https://ipa.ipasign.cc/sign`.
- Polling status is checked at `https://ipa.ipasign.cc/status/{task_id}`.

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
