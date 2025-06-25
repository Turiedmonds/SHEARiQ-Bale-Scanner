// Moved JavaScript from index.html
let GoogleAuth;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

function initClient() {
    gapi.client.init({
        apiKey: '', // Optional, can leave blank
        clientId: CONFIG.oauthClientId,
        scope: SCOPE,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
    }).then(function () {
        GoogleAuth = gapi.auth2.getAuthInstance();
        if (GoogleAuth.isSignedIn.get()) {
            console.log('Already signed in');
        }
        document.getElementById("signInButton").disabled = false;
    });
}

function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

function signIn() {
    if (!GoogleAuth) {
        alert("Google API still loading. Please try again.");
        handleClientLoad();
        return Promise.reject("GoogleAuth not initialized");
    }
    return GoogleAuth.signIn().then(function() {
        console.log("Signed in successfully");
    });
}

function uploadFileToGoogleDrive(fileContent, fileName) {
    const file = new Blob([fileContent], { type: 'text/csv' });
    const metadata = {
        'name': fileName,
        'mimeType': 'text/csv'
    };

    const accessToken = gapi.auth.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form
    }).then(response => response.json())
    .then(result => {
        console.log('File uploaded successfully. File ID: ' + result.id);
        alert('File uploaded successfully to Google Drive.');
    }).catch(error => {
        console.error('Error uploading file: ', error);
        alert('Upload failed. File saved locally for later upload.');
        savePendingUpload(fileContent, fileName);
    });
}

const PENDING_UPLOADS_KEY = 'pendingUploads';

function updatePendingUploadsCounter() {
    const count = JSON.parse(localStorage.getItem(PENDING_UPLOADS_KEY) || '[]').length;
    const el = document.getElementById('pendingUploadsCounter');
    if (el) el.textContent = 'Pending Uploads: ' + count;
}

function savePendingUpload(content, name) {
    const pending = JSON.parse(localStorage.getItem(PENDING_UPLOADS_KEY) || '[]');
    pending.push({ fileName: name, fileContent: content });
    localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(pending));
    updatePendingUploadsCounter();
}

function uploadPendingUploads() {
    if (!navigator.onLine) return;
    const pending = JSON.parse(localStorage.getItem(PENDING_UPLOADS_KEY) || '[]');
    if (!pending.length) return;

    const ensureSignIn = GoogleAuth && GoogleAuth.isSignedIn.get()
        ? Promise.resolve()
        : signIn();

    ensureSignIn.then(() => {
        const remaining = [];
        pending.forEach(item => {
            try {
                uploadFileToGoogleDrive(item.fileContent, item.fileName);
            } catch (e) {
                console.error('Upload failed for', item.fileName, e);
                remaining.push(item);
            }
        });
        if (remaining.length) {
            localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(remaining));
        } else {
            localStorage.removeItem(PENDING_UPLOADS_KEY);
        }
        updatePendingUploadsCounter();
    });
}

window.addEventListener('online', uploadPendingUploads);

let baleCount = 0;
let sessionCount = 0;
let baleCountSet = false;
let videoStream = null;
let animationFrameId = null;

// Function to insert a new day separator row
function insertDaySeparatorRow(body) {
    const row = body.insertRow();
    row.classList.add("day-separator");
    row.setAttribute("data-separator-date", new Date().toDateString());

    const cell = row.insertCell(0);
     cell.colSpan = 6;
    cell.innerHTML = "&nbsp;";
}

// Function to check if it's a new day and insert separator if needed
function checkForNewDay(farmName, logBody) {
    const dateKey = getFarmKey('lastScanDate', farmName);
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(dateKey);
const separatorExists = Array.from(logBody.querySelectorAll('tr.day-separator'))
        .some(row => row.getAttribute('data-separator-date') === today);

    if (lastDate && lastDate !== today && !separatorExists) {
        insertDaySeparatorRow(logBody);
        storeFarmData(farmName);
        }

    if (lastDate !== today) {
        localStorage.setItem(dateKey, today);
    } else if (!lastDate) {
        localStorage.setItem(dateKey, today); 
    }
}

function getFarmKey(prefix, farmName) {
    return prefix + '_' + farmName.toLowerCase();
}

function storeFarmData(farmName) {
    if (!farmName) return;
    const logBody = document.getElementById("logTable").querySelector("tbody");
    const logData = Array.from(logBody.rows).map(r => Array.from(r.cells).map(c => c.textContent));
    localStorage.setItem(getFarmKey('logData', farmName), JSON.stringify(logData));

    const totalsBody = document.getElementById("woolTypeTotals").querySelector("tbody");
    const totalsData = Array.from(totalsBody.rows).map(r => [r.cells[0].textContent, r.cells[1].textContent]);
    localStorage.setItem(getFarmKey('totals', farmName), JSON.stringify(totalsData));
}

function loadFarmData() {
    const farmName = document.getElementById("station").value.trim();
    if (!farmName) return;

    const logBody = document.getElementById("logTable").querySelector("tbody");
    logBody.innerHTML = '';
    const storedLogs = JSON.parse(localStorage.getItem(getFarmKey('logData', farmName)) || '[]');
    storedLogs.forEach(rowData => {
        const row = logBody.insertRow();
        rowData.forEach(cell => row.insertCell().textContent = cell);
       while (row.cells.length < 6) row.insertCell().textContent = ''; 
    });

    const totalsBody = document.getElementById("woolTypeTotals").querySelector("tbody");
    totalsBody.innerHTML = '';
    const storedTotals = JSON.parse(localStorage.getItem(getFarmKey('totals', farmName)) || '[]');
    storedTotals.forEach(([type, count]) => {
        const row = totalsBody.insertRow();
        row.insertCell(0).textContent = type;
        row.insertCell(1).textContent = count;
    });

    const storedBale = getStoredBaleCount(farmName);
    if (storedBale !== null) {
        baleCount = storedBale;
        sessionCount = logBody.rows.length;
        baleCountSet = true;
        updateDisplays();
    }
}

function getStoredBaleCount(farmName) {
    const key = "lastBale_" + farmName.toLowerCase();
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored) + 1 : null;
}

function storeBaleCount(farmName, count) {
    const key = "lastBale_" + farmName.toLowerCase();
    localStorage.setItem(key, count);
}

function setStartingBale() {
    const farmName = document.getElementById("station").value.trim();
    loadFarmData();
    if (farmName) {
        const stored = getStoredBaleCount(farmName);
        if (stored !== null) {
            document.getElementById("startBale").value = stored;
        }
    }

    const start = parseInt(document.getElementById("startBale").value);
    if (!isNaN(start)) {
        baleCount = start;
        sessionCount = 0;
        baleCountSet = true;
        updateDisplays();
    }
}

function resetThisFarmSession() {
    if (!confirm("This will clear all data for this farm. Save the session by tapping the End of Day button first. Continue?")) {
        return;
    }
    const farmNameInput = document.getElementById("station").value.trim();
    if (!farmNameInput) {
        alert("Please enter a farm name to reset.");
        return;
    }

    const key = "lastBale_" + farmNameInput.toLowerCase();
    localStorage.removeItem(key);
    localStorage.removeItem(getFarmKey('logData', farmNameInput));
    localStorage.removeItem(getFarmKey('totals', farmNameInput));

    const logBody = document.getElementById("logTable").querySelector("tbody");
    const totalsBody = document.getElementById("woolTypeTotals").querySelector("tbody");
    logBody.innerHTML = '';
    totalsBody.innerHTML = '';
    document.getElementById("startBale").value = 1;

    baleCount = 0;
    sessionCount = 0;
    baleCountSet = false;
    updateDisplays();

    alert(`Reset complete for "${farmNameInput}". All bale data cleared for this farm.`);
}

function updateDisplays() {
    document.getElementById("currentBaleDisplay").textContent = "Current Bale: " + baleCount;
    document.getElementById("lastBaleNumberDisplay").textContent = "Last Bale #: " + (baleCount > 0 ? baleCount - 1 : 0);
    document.getElementById("todayCountDisplay").textContent = "Today's Bale Count: " + sessionCount;
}

function newStartDay() {
    const logBody = document.getElementById("logTable").querySelector("tbody");
    const row = logBody.insertRow();
    row.classList.add("day-separator");
    row.setAttribute('data-separator-date', new Date().toDateString());
    const cell = row.insertCell(0);
    cell.colSpan = 6;
    cell.innerHTML = "&nbsp;";
    storeFarmData(document.getElementById("station").value.trim());
    location.reload();
}

function logBale(qrText) {
    playFeedback();
    const table = document.getElementById("logTable").querySelector("tbody");
    const noteInput = document.getElementById("note");
    const note = noteInput ? noteInput.value.trim() : "";
    const row = table.insertRow();
    row.insertCell(0).textContent = baleCount;
    row.insertCell(1).textContent = qrText;
    row.insertCell(2).textContent = document.getElementById("presser").value;
    row.insertCell(3).textContent = document.getElementById("station").value;
    row.insertCell(4).textContent = new Date().toLocaleString();
    row.insertCell(5).textContent = note;
    if (noteInput) noteInput.value = "";
    sessionCount++;
    storeBaleCount(document.getElementById("station").value.trim(), baleCount);
    baleCount++;
    updateDisplays();
    updateWoolTypeTotals(qrText.trim());
    storeFarmData(document.getElementById("station").value.trim());
}

function startQRScan() {
    if (!baleCountSet) {
        alert("Please set a starting bale number first.");
        return;
    }

    const scanBox = document.getElementById("scanBox");
    scanBox.innerHTML = '';
    const video = document.createElement("video");
    video.id = "preview";
    video.style.width = "100%";
    video.style.height = "100%";
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    scanBox.appendChild(video);

    const canvasElement = document.createElement("canvas");
    const canvas = canvasElement.getContext("2d");

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            videoStream = stream;
            video.srcObject = stream;
            requestAnimationFrame(tick);
        })
        .catch(function(err) {
            alert("Camera error: " + err.message);
        });

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                logBale(code.data);
                stopQRScan();
                return;
            }
        }
        animationFrameId = requestAnimationFrame(tick);
    }
}

function stopQRScan() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    const scanBox = document.getElementById("scanBox");
    scanBox.innerHTML = '';
    const btn = document.createElement('button');
    btn.id = 'startScanBtn';
    btn.textContent = 'Start QR Scan';
    btn.addEventListener('click', startQRScan);
    scanBox.appendChild(btn);

     const manualBtn = document.createElement('button');
    manualBtn.id = 'manualEntryButton';
    manualBtn.textContent = 'Manual Entry';
    manualBtn.addEventListener('click', manualEntry);
    scanBox.appendChild(manualBtn);
}

function manualEntry() {
    if (!baleCountSet) {
        alert('Please set a starting bale number first.');
        return;
    }
    const woolType = prompt('Enter wool type:');
    if (woolType === null) return;
    const trimmed = woolType.trim();
    if (!trimmed) {
        alert('Wool type cannot be empty.');
        return;
    }
    logBale(trimmed);
}

function deleteLastEntry() {
    const farmName = document.getElementById("station").value.trim();
    const logTable = document.getElementById("logTable").querySelector("tbody");
    const lastRow = logTable.rows[logTable.rows.length - 1];
    if (!lastRow) return;
    if (lastRow.classList.contains("day-separator")) {
        logTable.removeChild(lastRow);
        storeFarmData(farmName);
        return;
    }
    const woolType = lastRow.cells[1].textContent.trim();
    const totalsTable = document.getElementById("woolTypeTotals").querySelector("tbody");
    for (let i = 0; i < totalsTable.rows.length; i++) {
        let row = totalsTable.rows[i];
        if (row.cells[0].textContent.trim() === woolType) {
            let count = parseInt(row.cells[1].textContent);
            if (count > 1) {
                row.cells[1].textContent = count - 1;
            } else {
                totalsTable.deleteRow(i);
            }
            break;
        }
    }
    logTable.removeChild(lastRow);
    sessionCount = Math.max(0, sessionCount - 1);
    baleCount = Math.max(0, baleCount - 1);
    storeBaleCount(farmName, baleCount > 0 ? baleCount - 1 : 0);
    updateDisplays();
    storeFarmData(farmName);
}

function escapeCSV(str) {
    return '"' + String(str).replace(/"/g, '""') + '"';
}

function exportCSV() {
    const rows = [["#", "Wool Type", "Presser", "Farm", "Timestamp", "Notes"]];
    const table = document.getElementById("logTable").querySelector("tbody");
    for (let row of table.rows) {
        let cells = Array.from(row.cells).map(cell => cell.textContent);
        while (cells.length < 6) cells.push('');
        rows.push(cells);
    }

    const totalsTable = document.getElementById("woolTypeTotals").querySelector("tbody");
    rows.push([]);
    rows.push(["Wool Type", "Total Bales"]);
    for (let row of totalsTable.rows) {
        let cells = Array.from(row.cells).map(cell => cell.textContent);
        rows.push(cells);
    }

    const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    const farmName = document.getElementById("station").value.trim() || "farm";
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const fileName = `${farmName.replace(/\s+/g, '_')}_${dateStr}.csv`;
    a.setAttribute("download", fileName);
    a.click();

    if (!navigator.onLine) {
        savePendingUpload(csvContent, fileName);
        return;
    }

    if (GoogleAuth && GoogleAuth.isSignedIn.get()) {
        uploadFileToGoogleDrive(csvContent, fileName);
    } else {
        signIn().then(() => uploadFileToGoogleDrive(csvContent, fileName))
               .catch(() => savePendingUpload(csvContent, fileName));
    }
  shareCSV(csvContent, fileName);
}

function shareCSV(csvContent, fileName) {
    const file = new File([csvContent], fileName, { type: 'text/csv' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
            files: [file],
            title: 'Bale Log',
            text: 'End of day bale log attached.'
        }).catch(err => console.error('Share failed:', err));
    } else {
        const mailBody = encodeURIComponent('Please see the attached bale log: ' + fileName);
        window.location.href = 'mailto:?subject=' + encodeURIComponent('Bale Log') + '&body=' + mailBody;
    }   
}

function resetAllFarms() {
    if (!confirm("This will clear all farm data. Save sessions by tapping the End of Day button first. Continue?")) {
        return;
    }
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("lastBale_") || key.startsWith("logData_") || key.startsWith("totals_"))) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    const logBody = document.getElementById("logTable").querySelector("tbody");
    const totalsBody = document.getElementById("woolTypeTotals").querySelector("tbody");
    logBody.innerHTML = '';
    totalsBody.innerHTML = '';
    document.getElementById("startBale").value = 1;

    baleCount = 0;
    sessionCount = 0;
    baleCountSet = false;
    updateDisplays();

    alert("All farm bale counts have been reset.");
}

function playFeedback() {
    const beep = document.getElementById("beepSound");
    if (beep) beep.play();
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
}

function updateWoolTypeTotals(woolType) {
    const totalsTable = document.getElementById("woolTypeTotals").getElementsByTagName("tbody")[0];
    let found = false;

    for (let row of totalsTable.rows) {
        let typeCell = row.cells[0];
        let countCell = row.cells[1];
        if (typeCell.textContent === woolType) {
            countCell.textContent = parseInt(countCell.textContent) + 1;
            found = true;
            break;
        }
    }

    if (!found) {
        let newRow = totalsTable.insertRow();
        let woolTypeCell = newRow.insertCell(0);
        let countCell = newRow.insertCell(1);
        woolTypeCell.textContent = woolType;
        countCell.textContent = "1";
    }
}

// Recalculate wool type totals based on the entire log table
function rebuildWoolTypeTotals() {
    const totalsBody = document.getElementById("woolTypeTotals").querySelector("tbody");
    totalsBody.innerHTML = '';
    const counts = {};
    const logRows = document.getElementById("logTable").querySelector("tbody").rows;
    for (let row of logRows) {
        if (row.classList.contains('day-separator')) continue;
        const type = row.cells[1].textContent.trim();
        if (type) counts[type] = (counts[type] || 0) + 1;
    }
    Object.keys(counts).forEach(type => {
        const r = totalsBody.insertRow();
        r.insertCell(0).textContent = type;
        r.insertCell(1).textContent = counts[type];
    });
}

// Update bale counters and today's count based on table rows
function recalcBaleCounts() {
    const logRows = document.getElementById("logTable").querySelector("tbody").rows;
    sessionCount = 0;
    let maxNum = 0;
    for (let row of logRows) {
        if (row.classList.contains('day-separator')) continue;
        sessionCount++;
        const num = parseInt(row.cells[0].textContent);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    baleCount = maxNum + 1;
    baleCountSet = true;
    storeBaleCount(document.getElementById("station").value.trim(), maxNum);
    updateDisplays();
}

let editMode = false;
let allowBaleEdit = false;

// Toggle entire table between editable inputs and plain text
function toggleEditTable() {
    const body = document.getElementById('logTable').querySelector('tbody');
    const button = document.getElementById('editTableButton');
    if (!editMode) {
        allowBaleEdit = confirm('Edit bale numbers as well?');
        for (let row of body.rows) {
            if (row.classList.contains('day-separator')) continue;
            for (let i = 0; i < row.cells.length; i++) {
                if (i === 0 && !allowBaleEdit) continue;
                const cell = row.cells[i];
                const input = document.createElement('input');
                input.value = cell.textContent;
                if (i === 0) input.type = 'number';
                cell.textContent = '';
                cell.appendChild(input);
            }
        }
        button.textContent = 'Save Table';
    } else {
        for (let row of body.rows) {
            if (row.classList.contains('day-separator')) continue;
            for (let i = 0; i < row.cells.length; i++) {
                if (i === 0 && !allowBaleEdit) continue;
                const input = row.cells[i].querySelector('input');
                if (input) {
                    row.cells[i].textContent = input.value.trim();
                }
            }
        }
        allowBaleEdit = false;
        rebuildWoolTypeTotals();
        recalcBaleCounts();
        storeFarmData(document.getElementById("station").value.trim());
        button.textContent = 'Edit Table';
    }
    editMode = !editMode;
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

window.addEventListener('load', () => {
    handleClientLoad();
    uploadPendingUploads();
    updatePendingUploadsCounter();

    document.getElementById('signInButton').addEventListener('click', signIn);
    document.querySelector('.new-day-button').addEventListener('click', newStartDay);
    document.getElementById('resetAllButton').addEventListener('click', resetAllFarms);
    document.getElementById('station').addEventListener('change', loadFarmData);
    document.getElementById('setStartButton').addEventListener('click', setStartingBale);
    document.getElementById('resetFarmButton').addEventListener('click', resetThisFarmSession);
    document.getElementById('startScanBtn').addEventListener('click', startQRScan);
    document.getElementById('manualEntryButton').addEventListener('click', manualEntry);
    document.getElementById('exportButton').addEventListener('click', exportCSV);
    document.getElementById('deleteLastButton').addEventListener('click', deleteLastEntry);
document.getElementById('editTableButton').addEventListener('click', toggleEditTable);
});
