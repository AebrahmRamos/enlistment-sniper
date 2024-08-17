const fs = require('fs').promises;
const path = require('path');
const fetchJSON = require('./fetchJSON');
const animosys = require('./animosys');

const courseJSONDir = 'courseJSON';
const watchlistFile = 'watchlist.txt';
const fetchInterval = 10000; // 10 seconds

async function readWatchlist() {
    try {
        const data = await fs.readFile(watchlistFile, 'utf8');
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error('Error reading watchlist file:', error);
        return [];
    }
}

async function loadJSONFiles() {
    const files = await fs.readdir(courseJSONDir);
    const jsonData = {};

    for (const file of files) {
        if (path.extname(file) === '.json') {
            const filePath = path.join(courseJSONDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            jsonData[path.basename(file, '.json')] = JSON.parse(content);
        }
    }

    return jsonData;
}

function checkAvailability(courses, watchlist) {
    const availableClasses = [];
    
    console.log('Watchlist:', watchlist);
    for (const subject in courses) {
        for (const course of courses[subject]) {
            if (watchlist.includes(course.classNbr)) {
                console.log(`Class ${course.classNbr}: ${course.course}, Enrolled: ${course.enrolled}, Enrollment Cap: ${course.enrollmentCap}, Included in Watchlist: ${watchlist.includes(course.classNbr)}`);
                console.log('Availabile:', parseInt(course.enrolled) < parseInt(course.enrollmentCap), '\n');

                if (parseInt(course.enrolled) < parseInt(course.enrollmentCap)) {
                    console.log(`Class ${course.classNbr} is available for ${course.course}`);
                    availableClasses.push(course.classNbr);
                }
            }
        }
    }

    return availableClasses;
}

async function main() {
    console.log('Starting enrollment monitoring...');

    setInterval(async () => {
        try {
            await fetchJSON();
            console.log('\n\nfetchJSON completed successfully\n\n');
            await checkAndSnipe();
        } catch (error) {
            console.error('Error running fetchJSON:', error);
        }
    }, fetchInterval);

    // Initial check
    await checkAndSnipe();
}

async function checkAndSnipe() {
    const watchlist = await readWatchlist();
    const courses = await loadJSONFiles();
    const availableClasses = checkAvailability(courses, watchlist);
    console.log('Checking for available classes...');

    for (const classNbr of availableClasses) {
        console.log(`Class ${classNbr} is available. Running animosys...`);
        try {
            await animosys(classNbr);
            console.log(`Enrollment attempt for class ${classNbr} completed`);
        } catch (error) {
            console.error(`Error during enrollment for class ${classNbr}:`, error);
        }
    }

    if (availableClasses.length === 0) {
        console.log('No available classes found\n');
    }
}

main().catch(console.error);