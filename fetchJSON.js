const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');
const util = require('util');
const execPromise = util.promisify(exec);

const outputDir = 'courseJSON';
const subjectsFile = 'subjects.txt';

async function fetchObject() {
    // const clearanceData = await get_cf_clearance('https://enroll.dlsu.edu.ph/dlsu/view_course_offerings');
    // if (!clearanceData.success) {
    //     throw new Error('Failed to obtain clearance cookie');
    // }

    // const cookie = clearanceData.cookie;
    // const userAgent = clearanceData.user_agent;
    const cookie = 'cf_clearance=yX9fsipZv0WaXbUpcg3ZTL0lgDGFBrBF.qQ.W4yabN0-1745396972-1.2.1.1-2XZiUvxAigQ_ifMs_AmwawuStcCJ5of6WEsDUrEEFDMCIOt2LTPKJgRO6xLvOrwNTsGNk6MbwOWcdaMBKUqf7Oj2FuQJrtXk3PYV06ezKWDMqSYdFObljkjwhIVjERGRJOyWHTyTPjzZCWKoih7RVi9FP38uS__clK2zXVzpx.CSSaaSx84_dCVW2_NvZXfMtumVGbGYSLchpdH_F3OO7fHwY2O83YuiCG3B7gCbkwk3fvLMwwQ6MkZofxwnFp1viC3.0FG.i6YUajbXmpJx.PqO7rslnCtmLPBWJQlr_FFwwHIDsxju0M0Xv7PGDjlDH.DAv7jU5iHVlQ5BsxynOAFXql86I2NKCk0aRO3cU8RtjQUDLfuJ2Qsz2Ov5sZrp; NSC_Fospmm_TTM=ffffffffc3a017b045525d5f4f58455e445a4a423660; DLSU1=12216496; DLSU2=228336; DLSU3=; DLSU4=STU; DLSU5=RAMOS, AEBRAHM CLYDE  PELAYO; DLSU6=April     21, 2025 12:30:36 PM; DLSU8=; DLSU9=PROCEED_TO_MAIN_PAGE; DLSU10=; DLSU11=04/23/25 1114; DLSU12=; DLSU13=Y; DLSU14=';
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:137.0) Gecko/20100101 Firefox/137.0';

    await ensureDirectoryExists(outputDir);
    const subjects = await readSubjectsFile();

    for (const subject of subjects) {
        const success = await fetchAndParseSubject(subject, cookie, userAgent);
        if (!success) {
            console.log(`Failed to process data for ${subject}`);
        }
        if (success === 403) {
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

async function fetchAndParseSubject(subject, cookie, userAgent) {
    return new Promise((resolve, reject) => {
        const curlCommand = `curl -X POST 'https://enroll.dlsu.edu.ph/dlsu/view_course_offerings' \
            -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
            -H 'accept-language: en-US,en;q=0.9' \
            -H 'cache-control: max-age=0' \
            -H 'content-type: application/x-www-form-urlencoded' \
            -H 'cookie: ${cookie}' \
            -H 'origin: https://enroll.dlsu.edu.ph' \
            -H 'referer: https://enroll.dlsu.edu.ph/dlsu/view_course_offerings' \
            -H 'user-agent: ${userAgent}' \
            --data-raw 'p_course_code=${subject}&p_option=all&p_button=Search&p_id_no=12234192&p_button=Search'`;

        exec(curlCommand, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing curl command: ${stderr}`);
                return resolve(403);
            }

            try {
                const htmlData = stdout;
                const subjects = extractSubjectInformation(htmlData);

                const outputFile = path.join(outputDir, `${subject}.json`);
                await fs.writeFile(outputFile, JSON.stringify(subjects, null, 2));

                console.log(`Fetched and Parsed ${subject}`);
                resolve(true);
            } catch (parseError) {
                console.error(`Error parsing data for ${subject}:`, parseError);
                resolve(false);
            }
        });
    });
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

async function get_cf_clearance(url, timeout = 30, proxy = null, headless = true) {
    try {
        console.log('Starting process to obtain Cloudflare clearance cookie...');

        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        const curlCommand = `curl -s -D - -o /dev/null -A "${userAgent}" "${url}"`;

        const { stdout, stderr } = await execPromise(curlCommand);

        if (stderr) {
            console.error('Error executing curl command:', stderr);
            return { success: false, error: stderr };
        }

        const cookieMatch = stdout.match(/set-cookie: (.*?);/i);
        if (!cookieMatch) {
            console.error('Failed to extract Cloudflare clearance cookie');
            return { success: false, error: 'No clearance cookie found' };
        }

        const cookie = cookieMatch[1];
        console.log('Successfully obtained Cloudflare clearance cookie');

        return {
            success: true,
            cookie,
            user_agent: userAgent
        };
    } catch (error) {
        console.error('Error obtaining Cloudflare clearance cookie:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { get_cf_clearance, fetchObject };