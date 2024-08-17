const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

const outputDir = 'courseJSON';
const subjectsFile = 'subjects.txt';
const cookie = 'YOUR_COOKIE_HERE';

async function fetchJSON() {
    await ensureDirectoryExists(outputDir);
    
    const subjects = await readSubjectsFile();
    
    for (const subject of subjects) {
        const success = await fetchAndParseSubject(subject, cookie);
        if (!success) {
            console.log(`Failed to process data for ${subject}`);
        }
        if(success === 403) {
            throw new Error('Invalid cookie');
        }
    }
}

async function ensureDirectoryExists(directory) {
    try {
        await fs.access(directory);
    } catch (error) {
        await fs.mkdir(directory);
    }
}

async function fetchAndParseSubject(subject, cookie) {
    try {
        const response = await axios.post('https://enroll.dlsu.edu.ph/dlsu/view_course_offerings', 
            `p_course_code=${subject}&p_option=all&p_button=Search&p_id_no=12234192&p_button=Search`,
            {
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'accept-language': 'en-US,en;q=0.9',
                    'cache-control': 'max-age=0',
                    'content-type': 'application/x-www-form-urlencoded',
                    'cookie': cookie,
                    'origin': 'https://enroll.dlsu.edu.ph',
                    'referer': 'https://enroll.dlsu.edu.ph/dlsu/view_course_offerings',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
                }
            }
        );

        const htmlData = response.data;
        const subjects = extractSubjectInformation(htmlData);

        const outputFile = path.join(outputDir, `${subject}.json`);
        await fs.writeFile(outputFile, JSON.stringify(subjects, null, 2));

        console.log(`Fetched and Parsed ${subject}`);
        return true;
    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.log("Cookie provided is invalid, please change cookie");
        }
        return 403;
    }
}

function extractSubjectInformation(html) {
    const { window } = new JSDOM(html);
    const $ = (selector) => [...window.document.querySelectorAll(selector)];

    const subjects = [];
    let currentSubject = null;

    const rows = $('form table tbody tr');
    for (const row of rows) {
        const cells = [...row.querySelectorAll('td')];

        if (cells.length === 9 && cells[0].textContent.trim() !== 'Class Nbr' && cells[0].textContent.trim() !== '') {
            if (currentSubject) {
                subjects.push(currentSubject);
            }
            currentSubject = {
                classNbr: cells[0].textContent.trim(),
                course: cells[1].textContent.trim(),
                section: cells[2].textContent.trim(),
                schedules: [{
                    day: cells[3].textContent.trim(),
                    time: cells[4].textContent.trim(),
                    room: cells[5].textContent.trim() || null,
                }],
                enrollmentCap: cells[6].textContent.trim(),
                enrolled: cells[7].textContent.trim(),
                remarks: cells[8].textContent.trim(),
                professor: null,
            };
        } else if (cells.length === 1 && cells[0].getAttribute('colspan') === '6') {
            if (currentSubject) {
                currentSubject.professor = cells[0].textContent.trim();
            }
        } else if (cells.length >= 4 && currentSubject) {
            const day = cells[3].textContent.trim();
            if (['M', 'T', 'W', 'H', 'F', 'S'].includes(day)) {
                currentSubject.schedules.push({
                    day: day,
                    time: cells[4].textContent.trim(),
                    room: cells[5].textContent.trim() || null,
                });
            }
        }
    }

    if (currentSubject) {
        subjects.push(currentSubject);
    }

    return subjects;
}

async function readSubjectsFile() {
    try {
        const data = await fs.readFile(subjectsFile, 'utf8');
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error('Error reading subjects file:', error);
        return [];
    }
}

(async () => {
    await ensureDirectoryExists(outputDir);
    
    const subjects = await readSubjectsFile();
    
    for (const subject of subjects) {
        const success = await fetchAndParseSubject(subject, cookie);
        if (!success) {
            console.log(`Failed to process data for ${subject}`);
        }
        if(success === 403) {
            break;
        }
    }
})();

module.exports = fetchJSON;