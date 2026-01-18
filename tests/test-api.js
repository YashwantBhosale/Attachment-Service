const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api';
const CREDENTIALS_FILE = path.join(__dirname, 'test-credentials.json');

const log = {
    success: (msg) => console.log(`[SUCCESS] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    info: (msg) => console.log(`[INFO] ${msg}`),
    test: (msg) => console.log(`\n[TEST] ${msg}`),
    auth: (msg) => console.log(`[AUTH] ${msg}`)
};

let token = null;
let api = null;
let documentId = null;
let imageId = null;

function extractAxiosError(err) {
    if (err.response) {
        return {
            status: err.response.status,
            message: err.response.data?.message || 'Request failed',
            data: err.response.data
        };
    }
    if (err.request) {
        return { message: 'No response from server' };
    }
    return { message: err.message };
}

function loadCredentials() {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
}

function saveCredentials(email, password) {
    fs.writeFileSync(
        CREDENTIALS_FILE,
        JSON.stringify({ email, password }, null, 2)
    );
}

function generateTestUser() {
    const id = crypto.randomBytes(4).toString('hex');
    return {
        name: `Test User ${id}`,
        email: `test_${id}@example.com`,
        password: `TestPass${id}!123`
    };
}

async function signup() {
    log.auth('Creating new user');
    const user = generateTestUser();
    const res = await axios.post(`${BASE_URL}/auth/signup`, user);
    saveCredentials(user.email, user.password);
    return res.data.token;
}

async function login(email, password) {
    log.auth(`Logging in as ${email}`);
    const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    return res.data.token;
}

async function authenticate() {
    const creds = loadCredentials();
    if (creds?.email && creds?.password) {
        token = await login(creds.email, creds.password);
    } else {
        token = await signup();
    }

    api = axios.create({
        baseURL: BASE_URL,
        headers: { Authorization: `Bearer ${token}` }
    });

    log.success('Authenticated');
}

async function runTests() {
    try {
        await authenticate();
        await test0_getCurrentUser();
        await test1_healthCheck();
        await test2_uploadDocument();
        await test3_uploadImage();
        await test4_getUserDocuments();
        await test5_getDocumentById();
        await test6_downloadDocument();
        await test7_streamDocument();
        await test8_updateStatus();
        await test9_filterByType();
        await test10_uploadInvalidFile();
        await test11_getNonExistentDocument();
        await test12_deleteDocument();
        await test13_bulkUpload();
        log.success('All tests completed');
    } catch (err) {
        const e = extractAxiosError(err);
        log.error(`HTTP ${e.status || ''} ${e.message}`);
        if (e.data) console.error(JSON.stringify(e.data, null, 2));
        process.exit(1);
    }
}

async function test0_getCurrentUser() {
    log.test('Get Current User');
    const res = await api.get('/auth/me');
    console.log(JSON.stringify(res.data, null, 2));
}

async function test1_healthCheck() {
    log.test('Health Check');
    const res = await axios.get(`${BASE_URL}/health`);
    console.log(JSON.stringify(res.data, null, 2));
}

async function test2_uploadDocument() {
    log.test('Upload Document');
    const fd = new FormData();
    fd.append('file', fs.createReadStream('test-files/test-document.pdf'));
    fd.append('documentType', 'ID_PROOF');
    const res = await api.post('/documents/upload', fd, { headers: fd.getHeaders() });
    documentId = res.data.data._id;
    console.log(JSON.stringify(res.data, null, 2));
}

async function test3_uploadImage() {
    log.test('Upload Image');
    const fd = new FormData();
    fd.append('file', fs.createReadStream('test-files/test-image.png'));
    fd.append('documentType', 'PROFILE_PHOTO');
    const res = await api.post('/documents/upload', fd, { headers: fd.getHeaders() });
    imageId = res.data.data._id;
}

async function test4_getUserDocuments() {
    log.test('Get Documents');
    const res = await api.get('/documents/my-documents');
    console.log(JSON.stringify(res.data, null, 2));
}

async function test5_getDocumentById() {
    log.test('Get Document By ID');
    log.info(`Document ID: ${documentId}`);
    const res = await api.get(`/documents/stream/${documentId}`);
    console.log(JSON.stringify(res.data, null, 2));
}

async function test6_downloadDocument() {
    log.test('Download Document');
    const res = await api.get(`/documents/download/${documentId}`, { responseType: 'stream' });
    const w = fs.createWriteStream('downloaded.pdf');
    res.data.pipe(w);
    await new Promise(r => w.on('finish', r));
}

async function test7_streamDocument() {
    log.test('Stream Document');
    const res = await api.get(`/documents/stream/${documentId}`, { responseType: 'stream' });
    const w = fs.createWriteStream('streamed.pdf');
    res.data.pipe(w);
    await new Promise(r => w.on('finish', r));
}

async function test8_updateStatus() {
    log.test('Update Status');
    const res = await api.patch(`/documents/${documentId}/status`, { status: 'VERIFIED' });
    console.log(JSON.stringify(res.data, null, 2));
}

async function test9_filterByType() {
    log.test('Filter By Type');
    const res = await api.get('/documents/my-documents?documentType=ID_PROOF');
    console.log(JSON.stringify(res.data, null, 2));
}

async function test10_uploadInvalidFile() {
    log.test('Invalid Upload');
    fs.writeFileSync('test-files/invalid.txt', 'invalid');
    const fd = new FormData();
    fd.append('file', fs.createReadStream('test-files/invalid.txt'));
    fd.append('documentType', 'ID_PROOF');
    try {
        await api.post('/documents/upload', fd, { headers: fd.getHeaders() });
    } catch (err) {
        const e = extractAxiosError(err);
        log.error(`HTTP ${e.status} ${e.message}`);
    }
    fs.unlinkSync('test-files/invalid.txt');
}

async function test11_getNonExistentDocument() {
    log.test('Non-existent Document');
    try {
        await api.get('/documents/000000000000000000000000');
    } catch (err) {
        const e = extractAxiosError(err);
        log.error(`HTTP ${e.status} ${e.message}`);
    }
}

async function test12_deleteDocument() {
    log.test('Delete Document');
    const res = await api.delete(`/documents/${imageId}`);
    console.log(JSON.stringify(res.data, null, 2));
}

async function test13_bulkUpload() {
    log.test('Bulk Upload');
    const uploads = [];
    for (let i = 0; i < 3; i++) {
        const fd = new FormData();
        fd.append('file', fs.createReadStream('test-files/test-document.pdf'));
        fd.append('documentType', 'CERTIFICATE');
        uploads.push(api.post('/documents/upload', fd, { headers: fd.getHeaders() }));
    }
    await Promise.all(uploads);
}

runTests();
