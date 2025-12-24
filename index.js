import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsifyService {
    constructor() {
        this.baseURL = process.env.WHATSIFY_BASE_URL;
        this.apiSecret = process.env.WHATSIFY_API_SECRET;
        this.accountId = process.env.WHATSIFY_ACCOUNT_ID;

        this.api = axios.create({
            baseURL: this.baseURL,
            timeout: 60000,
        });
    }

    async validateNumber(phoneNumber) {
        try {
            let cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
            if (!cleanedNumber.startsWith('+')) {
                cleanedNumber = '+' + cleanedNumber;
            }

            const response = await this.api.post('/validate/whatsapp', {
                secret: this.apiSecret,
                unique: this.accountId,
                phone: cleanedNumber
            });

            return {
                success: true,
                exists: response.data.exists === 'true' || response.data.exists === true
            };
        } catch (error) {
            console.error('Number validation error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async sendVideo(phoneNumber, videoPath, caption = '') {
        try {
            const formData = new FormData();

            formData.append('secret', this.apiSecret);
            formData.append('account', this.accountId);
            formData.append('recipient', phoneNumber);
            formData.append('message', caption);
            formData.append('type', 'video');

            const videoBuffer = fs.readFileSync(videoPath);
            formData.append('video_file', videoBuffer, {
                filename: path.basename(videoPath),
                contentType: 'video/mp4'
            });

            const response = await this.api.post('/send/whatsapp', formData, {
                headers: formData.getHeaders(),
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Whatsify send error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async getAccountStatus() {
        try {
            const response = await this.api.post('/get/wa.accounts', {
                secret: this.apiSecret
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

class BulkSender {
    constructor() {
        this.whatsify = new WhatsifyService();
        this.numbersFile = path.join(__dirname, 'data', 'numbers.txt');
        this.videoFile = path.join(__dirname, 'data', 'video.mp4');
        this.logFile = path.join(__dirname, 'logs', 'sent.log');
        this.invalidNumbersFile = path.join(__dirname, 'logs', 'invalid_numbers.log');
        this.sentNumbers = new Set();
        this.invalidNumbers = new Set();
        this.currentIndex = 0;
        this.isRunning = false;

        this.message = `ਨਵੇਂ ਸਾਲ ਦੀ ਖੁਸ਼ੀ ਵਿੱਚ ਤੁਹਾਡੇ ਲਈ ਇੱਕ ਖਾਸ offer ਲਿਆਂਦਾ ਜਾ ਰਿਹਾ ਹੈ ਜੀ। ਇਸ ਵਿੱਚ ਤੁਹਾਨੂੰ high quality luxury perfume ਮਿਲਣਗੇ, ਜਿਹੜੇ ਆਮ ਤੌਰ ਤੇ showroom ਵਿੱਚ 10,000, 20,000, 30,000 ਦੇ ਰੇਟ ਤੇ ਮਿਲਦੇ ਨੇ, ਪਰ ਅਸੀ ਇਹ ਤੁਹਾਨੂੰ ਬਹੁਤ ਹੀ ਵਧੀਆ price ਤੇ ਦੇ ਰਹੇ ਹਾਂ ਜੀ।

*Available perfumes ਬਾਰੇ:*

ਵੀਡੀਓ ਦੇ end ਵਿੱਚ ਸਾਰੇ available perfume ਦੀਆਂ images attach ਕੀਤੀਆਂ ਗਈਆਂ ਨੇ ਜੀ। ਕਿਰਪਾ ਕਰਕੇ video ਪੂਰੀ ਵੇਖ ਕੇ last ਵਿੱਚ photos ਚੈੱਕ ਕਰ ਲਓ ਤੇ ਜਿਹੜਾ perfume ਪਸੰਦ ਆਵੇ, ਉਸਦਾ screenshot ਸਾਨੂੰ send ਕਰੋ ਜੀ।

*Order ਕਿਵੇਂ ਕਰਨਾ ਹੈ:*

* Jis perfume ਵਿੱਚ ਤੁਸੀਂ interested ਹੋ, ਉਸਦਾ screenshot WhatsApp ਤੇ ਸਾਨੂੰ send ਕਰੋ ਜੀ।  
* ਆਪਣੇ ਨਾਲ ਆਪਣਾ ਪੂਰਾ address, naam ਅਤੇ mobile number ਵੀ ਜ਼ਰੂਰ ਲਿਖ ਕੇ ਭੇਜੋ ਜੀ।  
* ਤੁਹਾਡੇ ਦਿੱਤੇ address ਤੇ ਹੀ parcel courier ਰਾਹੀਂ ਭੇਜਿਆ ਜਾਵੇਗਾ ਜੀ।  

*Payment details (UPI):*

* Payment sari advance UPI ਰਾਹੀਂ ਲੈ ਜਾਂਦੀ ਹੈ ਜੀ।  
* ਪਹਿਲਾਂ ਤੁਹਾਨੂੰ ਦੱਸਿਆ ਜਾਵੇਗਾ ਕਿ selected perfume available ਹੈ ਜਾਂ ਨਹੀਂ।  
* Available ਹੋਣ ਤੇ ਤੁਹਾਨੂੰ UPI QR code send ਕੀਤਾ ਜਾਵੇਗਾ, ਉਸ ਰਾਹੀਂ ਤੁਹਾਨੂੰ full payment 1500 pay ਕਰਨੀ ਹੋਵੇਗੀ ਜੀ।  

*Terms & Conditions:*

* 1499 ਤੋਂ ਘੱਟ payment ਵਿੱਚ ਨਾ perfume dispatch ਹੋਵੇਗਾ, ਨਾ hi payment refund ਕੀਤੀ ਜਾਵੇਗੀ ਜੀ।  
* Kisi v perfume di return ਜਾਂ exchange accept ਨਹੀਂ ਕੀਤੀ ਜਾਵੇਗੀ ਜੀ।  

ਧੰਨਵਾਦ ਜੀ, ਜੇ ਤੁਸੀਂ interested ਹੋ ਤਾਂ ਹੁਣੇ screenshot ਅਤੇ ਆਪਣਾ full address send ਕਰੋ ਜੀ।`;

        this.loadSentNumbers();
        this.loadInvalidNumbers();
    }

    loadSentNumbers() {
        if (fs.existsSync(this.logFile)) {
            const logs = fs.readFileSync(this.logFile, 'utf-8');
            const lines = logs.split('\n').filter(line => line.includes('SUCCESS'));
            lines.forEach(line => {
                const match = line.match(/\+\d+/);
                if (match) this.sentNumbers.add(match[0]);
            });
            console.log(`✅ Loaded ${this.sentNumbers.size} already sent numbers`);
        } else {
            fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
            fs.writeFileSync(this.logFile, '');
        }
    }

    loadInvalidNumbers() {
        if (fs.existsSync(this.invalidNumbersFile)) {
            const logs = fs.readFileSync(this.invalidNumbersFile, 'utf-8');
            const lines = logs.split('\n');
            lines.forEach(line => {
                const match = line.match(/\+\d+/);
                if (match) this.invalidNumbers.add(match[0]);
            });
            console.log(`⚠️ Loaded ${this.invalidNumbers.size} invalid numbers`);
        } else {
            fs.writeFileSync(this.invalidNumbersFile, '');
        }
    }

    getNumbers() {
        if (!fs.existsSync(this.numbersFile)) {
            throw new Error(`Numbers file not found: ${this.numbersFile}`);
        }

        const content = fs.readFileSync(this.numbersFile, 'utf-8');
        const numbers = content
            .split('\n')
            .map(num => num.trim())
            .filter(num => num.length > 0)
            .filter(num => !this.sentNumbers.has(num))
            .filter(num => !this.invalidNumbers.has(num));

        return numbers;
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        console.log(logMessage.trim());
        fs.appendFileSync(this.logFile, logMessage);
    }

    logInvalidNumber(number, reason) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INVALID: ${number} - ${reason}\n`;
        console.log(logMessage.trim());
        fs.appendFileSync(this.invalidNumbersFile, logMessage);
    }

    getRandomDelay() {
        // Random delay between 60-120 seconds (1-2 minutes)
        return Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
    }

    async sendToNext() {
        if (this.isRunning) {
            console.log('⏳ Already processing, skipping...');
            return;
        }

        this.isRunning = true;

        try {
            const numbers = this.getNumbers();

            if (numbers.length === 0) {
                this.log('✅ ALL NUMBERS PROCESSED! No more numbers to send.');
                this.isRunning = false;
                return;
            }

            const number = numbers[0];
            const totalProcessed = this.sentNumbers.size + this.invalidNumbers.size;
            const totalRemaining = numbers.length;

            this.log(`📋 Processing: ${number} (Sent: ${this.sentNumbers.size} | Invalid: ${this.invalidNumbers.size} | Remaining: ${totalRemaining})`);

            // Validate number first
            this.log(`🔍 Validating ${number}...`);
            const validation = await this.whatsify.validateNumber(number);

            if (!validation.success) {
                this.logInvalidNumber(number, 'Validation API failed');
                this.invalidNumbers.add(number);
                this.log(`⚠️ SKIPPED (validation failed): ${number}`);
                this.isRunning = false;
                return;
            }

            if (!validation.exists) {
                this.logInvalidNumber(number, 'Number not on WhatsApp');
                this.invalidNumbers.add(number);
                this.log(`⚠️ SKIPPED (not on WhatsApp): ${number}`);
                this.isRunning = false;
                return;
            }

            // Number is valid, proceed to send
            this.log(`✓ Valid WhatsApp number, sending video...`);

            const result = await this.whatsify.sendVideo(number, this.videoFile, this.message);

            if (result.success) {
                this.log(`✅ SUCCESS: ${number}`);
                this.sentNumbers.add(number);
            } else {
                this.log(`❌ FAILED: ${number} - ${result.error}`);
                // Don't add to invalid numbers if send fails, might be temporary issue
            }

            const nextDelay = this.getRandomDelay();
            this.log(`⏰ Next message in ${Math.round(nextDelay / 1000)} seconds\n`);

        } catch (error) {
            this.log(`❌ ERROR: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    async checkAccountStatus() {
        this.log('🔍 Checking Whatsify account status...');
        const status = await this.whatsify.getAccountStatus();
        if (status.success) {
            this.log(`✅ Account connected and active`);
        } else {
            this.log(`⚠️ Account status check failed: ${status.error}`);
        }
    }

    async start() {
        console.log('🚀 WhatsApp Bulk Sender Started!');
        console.log(`📊 Already sent: ${this.sentNumbers.size}`);
        console.log(`⚠️ Invalid numbers: ${this.invalidNumbers.size}`);
        console.log(`📹 Video: ${this.videoFile}`);
        console.log(`📞 Numbers: ${this.numbersFile}`);
        console.log('⏰ Sending every 1-2 minutes randomly\n');

        // Check video file exists
        if (!fs.existsSync(this.videoFile)) {
            console.error(`❌ ERROR: Video file not found at ${this.videoFile}`);
            console.error('   Please place your video.mp4 file in the data/ folder');
            process.exit(1);
        }

        // Check account status
        await this.checkAccountStatus();

        // Send immediately on start
        this.sendToNext();

        // Then schedule with cron (every minute, will check if can send)
        cron.schedule('* * * * *', () => {
            this.sendToNext();
        });
    }
}

// Initialize and start
const sender = new BulkSender();
sender.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    console.log(`📊 Final Stats - Sent: ${sender.sentNumbers.size} | Invalid: ${sender.invalidNumbers.size}`);
    process.exit(0);
});
