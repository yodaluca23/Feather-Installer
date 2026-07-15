const responseEl = document.getElementById('response');

async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
    }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function aesEncrypt(text, password) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));

    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
}

async function aesDecrypt(base64, password) {
    const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const salt = raw.slice(0, 16);
    const iv = raw.slice(16, 28);
    const data = raw.slice(28);
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result.split(',')[1]; // Remove data:...base64, prefix
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function updateStatus(content, type = 'info') {
    const base = "mt-6 text-sm font-mono p-4 rounded-lg border transition-all duration-300 ";
    const types = {
        info: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700",
        success: "bg-green-50 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100 dark:border-green-700",
        error: "bg-red-50 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100 dark:border-red-700",
        warning: "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-700"
    };
    responseEl.className = base + (types[type] || types.info);
    responseEl.innerHTML = content;
}

// Fetch the latest Feather IPA info from GitHub, using API instead of direct download so we can get the hash
async function getFeatherIpaInfo() {
    const latestReleaseUrl = 'https://api.github.com/repos/khcrysalis/feather/releases/latest';

    try {
        // Step 1: Fetch the latest release data
        const releaseResponse = await fetch(latestReleaseUrl, {
            headers: { 'Accept': 'application/vnd.github+json' }
        });

        if (!releaseResponse.ok) {
            throw new Error(`Failed to fetch release: ${releaseResponse.statusText}`);
        }

        const releaseData = await releaseResponse.json();
        const assetsUrl = releaseData.assets_url;

        // Step 2: Fetch the assets from the assets URL
        const assetsResponse = await fetch(assetsUrl, {
            headers: { 'Accept': 'application/vnd.github+json' }
        });

        if (!assetsResponse.ok) {
            throw new Error(`Failed to fetch assets: ${assetsResponse.statusText}`);
        }

        const assets = await assetsResponse.json();

        // Step 3: Find the "Feather.ipa" asset
        const featherIpa = assets.find(asset => asset.name === "Feather.ipa");

        if (!featherIpa) {
            throw new Error("Feather.ipa not found in assets");
        }

        // Return the download URL and digest (if available)
        return {
            url: featherIpa.url,
            digest: featherIpa.digest.replace('sha256:', '') || null  // Digest might not always be present
        };
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function verifyDigest(arrayBuffer, expectedDigest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`Calculated SHA-256: ${hashHex}`);
    console.log(`Expected SHA-256: ${expectedDigest}`);
    return hashHex === expectedDigest.toLowerCase();
}

async function uploadRawText(text, filename = 'upload.txt', time = '12h', litterbox = true) {
    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('time', time);
    formData.append('fileToUpload', file);

    const uploadUrl = litterbox ? 'https://litterbox.catbox.moe/resources/internals/api.php' : 'https://catbox.moe/user/api.php';
    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`);
        }

        const url = await response.text();
        const parsedUrl = new URL(url);
        const parts = parsedUrl.pathname.split('/');
        const filename = parts.pop(); // e.g. '872eh8.txt'
        const id = filename.replace('.txt', '');
        return id;

    } catch (error) {
        throw new Error(`Upload error: ${error.message}`);
    }
}

function generateRandomPassword() {
    const password = Array.from({ length: 24 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))
    ).join('');

    return password;
}

async function getEncryptedUrl(taskId, certificateData, litterbox = true) {
    showCopiedNotification('🔒 Encrypting and uploading data...');

    // Block button clicks while processing
    const container = document.getElementById('sendToPhoneContainer');
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    const password = generateRandomPassword();

    var encryptedJsonData = certificateData
    if (taskId && taskId.length > 0) {
        encryptedJsonData = JSON.stringify({
            taskId: await aesEncrypt(taskId, password),
            certificateData: await aesEncrypt(certificateData, password)
        });
    }

    const encryptedData = await aesEncrypt(encryptedJsonData, password);

    const uploadedUrlId = await uploadRawText(encryptedData, 'encryptedData.txt', '1h', litterbox);
    if (!uploadedUrlId) {
        throw new Error('File upload failed.');
    }

    // Renable buttons after processing
    buttons.forEach(btn => btn.disabled = false);

    if (!litterbox) {
        return uploadedUrlId, password;
    }

    // Build a shareable URL that points back to this page with the uploaded id and password in the hash.
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(uploadedUrlId)}#${encodeURIComponent(password)}`;

    return {
        url: shareUrl,
        password,
        id: uploadedUrlId
    };
}

async function downloadAndDecrypt(id, password) {
    try {
        const response = await fetch(`https://litter.catbox.moe/${id}.txt`);
        const text = await response.text();
        const decryptedText = await aesDecrypt(text, password);
        const data = JSON.parse(decryptedText);

        const decryptedTaskId = await aesDecrypt(data.taskId, password);
        const decryptedcertificateData = await aesDecrypt(data.certificateData, password);

        if (!decryptedTaskId || !decryptedcertificateData) throw new Error('Failed to decrypt data.');

        return { taskId: decryptedTaskId, certificateData: decryptedcertificateData };
    } catch (err) {
        console.error('Decryption error:', err);
        throw new Error('Failed to decrypt data.');
    }

}

function createFinalButtons(taskId, certificateData) {
    const container = document.getElementById('sendToPhoneContainer');
    container.innerHTML = ''; // Clear previous

    let encryptedUrlSaved = '';

    // 📱 Button to copy URL
    const button = document.createElement('button');
    button.textContent = '📱 Send to Phone';
    button.className = 'mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition';

    button.onclick = async () => {
        try {
            if (encryptedUrlSaved && encryptedUrlSaved.length > 3) {
                await navigator.clipboard.writeText(encryptedUrlSaved);
                showCopiedNotification();
            } else {
                const { url } = await getEncryptedUrl(taskId, certificateData);
                await navigator.clipboard.writeText(url);
                showCopiedNotification();
                encryptedUrlSaved = url; // Save the URL for future copies
            }
        } catch (err) {
            alert('Failed to copy URL: ' + err.message);
        }
    };

    container.appendChild(button);

    // 📷 QR Code Button
    const qrButton = document.createElement('button');
    qrButton.textContent = '📷 Generate QR Code';
    qrButton.className = 'mt-2 ml-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition';

    qrButton.onclick = async () => {
        try {
            let qrCodeUrl = encryptedUrlSaved;

            if (!qrCodeUrl || (qrCodeUrl && qrCodeUrl.length <= 3)) {
                const result = await getEncryptedUrl(taskId, certificateData);
                qrCodeUrl = result.url;
                encryptedUrlSaved = qrCodeUrl; // Save the URL for future copies
            }

            const qrContainer = document.getElementById('qrCodeContainer');
            qrContainer.innerHTML = '';

            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

            QRCode.toCanvas(qrCodeUrl, {
                width: 200,
                color: {
                    dark: isDark ? '#FFFFFF' : '#000000', // White QR on dark bg, black on light bg
                    light: isDark ? '#1f2937' : '#FFFFFF' // Match Tailwind dark:bg-gray-800 or white
                }
            }, (error, canvas) => {
                if (error) {
                    console.error(error);
                    qrContainer.innerHTML = '❌ Failed to generate QR code';
                    return;
                }

                const qrWrapper = document.createElement('div');
                qrWrapper.className = 'rounded-lg p-1 border-2 border-gray-600 bg-white dark:border-gray-500 dark:bg-gray-800 inline-block';

                qrWrapper.appendChild(canvas);
                qrContainer.appendChild(qrWrapper);
            });

        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload encrypted URL: ' + err.message);
        }
    };

    container.appendChild(qrButton);
    const qrContainer = document.createElement('div');
    qrContainer.id = 'qrCodeContainer';
    qrContainer.className = 'mt-4 flex justify-center';
    container.appendChild(qrContainer);

}

function showCopiedNotification(text = 'URL copied to clipboard!') {
    const notif = document.createElement('div');
    notif.textContent = `✅ ${text}`;
    notif.className = `
fixed bottom-[-100px] left-1/2 transform -translate-x-1/2 
bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg
transition-all duration-500 ease-in-out z-50
`;
    document.body.appendChild(notif);

    // Trigger slide in
    requestAnimationFrame(() => {
        notif.classList.remove('bottom-[-100px]');
        notif.classList.add('bottom-6');
    });

    // Slide out after 3s
    setTimeout(() => {
        notif.classList.remove('bottom-6');
        notif.classList.add('bottom-[-100px]');

        setTimeout(() => notif.remove(), 500);
    }, 3000);
}

async function pollStatus(taskId, certificateData, submitBtn = null, paramMode = false) {
    updateStatus(`🛠 Signing in progress...<br><code>Task ID: ${taskId}</code>`, 'info');

    // Prepare a safe certificate link HTML snippet to avoid ReferenceErrors when certificateData is missing.
    const certificateLinkHtml = certificateData ? `\n                    <a href="${certificateData}" target="_blank"\n                        class="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition">\n                        🔑 Import Certificate\n                    </a>` : '';

    const poll = async () => {
        try {
            const statusResponse = await fetch(`https://ipa.ipasign.cc/status/${taskId}`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'SUCCESS' && statusData.download_url) {
                const installUrl = `itms-services://?action=download-manifest&url=https://ipa.ipasign.cc/manifest/${statusData.task_id}.plist`;

                updateStatus(`
                    ✅ <strong>Signing complete!</strong><br><br>
                    <a href="${installUrl}" target="_blank"
                        class="inline-block mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition">
                        📲 Install Feather
                    </a>
                    ${certificateLinkHtml}
                `, 'success');

                // Only create final buttons if NOT in param mode
                if (!paramMode) {
                    createFinalButtons(taskId, certificateData);
                }

                if (submitBtn) submitBtn.disabled = false;
            } else if (statusData.status === 'FAILURE') {
                updateStatus(`❌ Signing failed:<br><code>${statusData.message || 'Unknown error'}</code>`, 'error');
                if (submitBtn) submitBtn.disabled = false;
            } else {
                updateStatus(`⏳ Status: ${statusData.status}...<br><code>Task ID: ${taskId}</code>`, 'info');
                setTimeout(poll, 3000);
            }
        } catch (err) {
            updateStatus('🚫 Error: ' + err.message, 'error');
            console.error('Error in polling process:', err);
            if (submitBtn) submitBtn.disabled = false;
        }
    };

    poll();
}

// Helper to get query params
function getQueryParam(name) {
    const value = new URLSearchParams(window.location.search).get(name);
    return value && value.trim() !== '' ? value : null;
}

window.addEventListener('DOMContentLoaded', () => {
    (async () => {
        const catboxId = getQueryParam('id');
        const passwordParam = location.hash ? location.hash.substring(1) : null;
        const form = document.getElementById('uploadForm');

        if (catboxId && passwordParam) {
            form.classList.add('hidden');
            updateStatus('🛠 Decryption in progress...', 'info');

            const password = decodeURIComponent(passwordParam);

            try {
                downloadAndDecrypt(catboxId, password).then(({ taskId: decryptedTaskId, certificateData: decryptedcertificateData }) => {
                    if (!decryptedTaskId || !decryptedcertificateData) {
                        throw new Error('Failed to decrypt data.');
                    } else {
                        pollStatus(decryptedTaskId, decryptedcertificateData, null, true);

                    }
                });
            } catch (err) {
                console.error('Decryption error:', err);
                updateStatus('🚫 Failed to decrypt data.', 'error');
            }
        }
    })();
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const password = form.password.value;
    const p12File = form.p12.files[0];
    const mpFile = form.mp.files[0];

    if (!password || !p12File || !mpFile) {
        updateStatus('⚠️ Please fill in all fields.', 'warning');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const container = document.getElementById('sendToPhoneContainer');
    container.innerHTML = ''; // Clear previous QR code and buttons

    updateStatus('🔄 Uploading and signing...', 'info');

    try {
        const info = await getFeatherIpaInfo();
        //console.log(info);

        const ipaResponse = await fetch('https://feather-cors.yodaluca.dev', {
            headers: {
                'Accept': 'application/octet-stream'
            }
        });

        if (!ipaResponse.ok) throw new Error('Failed to download IPA');
        const ipaArrayBuffer = await ipaResponse.arrayBuffer();

        // Perform integrity check
        if (info.digest) {
            const isValid = await verifyDigest(ipaArrayBuffer, info.digest);
            if (!isValid) throw new Error('IPA integrity check failed (digest mismatch)');
        } else {
            console.warn('No digest provided for IPA; skipping integrity check.');
        }

        const ipaBlob = new Blob([ipaArrayBuffer], { type: 'application/octet-stream' });

        const formData = new FormData();
        formData.append('ipa', ipaBlob, 'Feather.ipa');
        formData.append('p12', p12File);
        formData.append('mp', mpFile);
        formData.append('password', password);

        const uploadResponse = await fetch('https://ipa.ipasign.cc/sign', {
            method: 'POST',
            body: formData
        });

        const result = await uploadResponse.json();
        if (!result.task_id) throw new Error('No task_id returned from server');

        const taskId = result.task_id;

        const [p12Base64, mpBase64] = await Promise.all([
            fileToBase64(p12File),
            fileToBase64(mpFile),
        ]);
        const passwordBase64 = btoa(password);
        const certificateData = `feather://import-certificate?p12=${p12Base64}&mobileprovision=${mpBase64}&password=${passwordBase64}`;

        pollStatus(taskId, certificateData, submitBtn);
    } catch (err) {
        updateStatus('🚫 Error: ' + err.message, 'error');
        console.error('Error in signing process:', err);
        submitBtn.disabled = false;
    }
});