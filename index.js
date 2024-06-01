import express from 'express';
import fs from 'fs';
import Items from './modules/Items.js';
import Auth from './modules/Auth.js';
import Reporter from './helpers/Reporter.js';

const app = express();
app.use(express.json());

app.listen(3000, async (a, b) => {
    const args = process.argv.slice(2),
        auth = new Auth(),
        items = new Items(),
        reporter = new Reporter()

    // Config file
    const { fileName, confFile } = auth.getConfigFile()

    // Fot overriding arguments(testing)
    // args[0] = 4

    // Check if online
    try {
        if (args[0] == 0) {
            const content = await auth.isAuthorized();
            console.log(content)
        }

        // Config keys
        if (args[0] == 1) {
            confFile.auth = {
                clientId: args[1],
                clientSecret: args[2],
                redirectUri: args[3]
            }

            fs.writeFileSync(fileName, JSON.stringify(confFile), 'utf8');
            const url = auth.getAuthorizationCodeUrl()
            console.log(url.replaceAll('&', '^&'));
        }

        // Config interval and discount
        if (args[0] == 2) {
            const fileName = './config.json'

            const intervalDays = args[1]
            const discount = args[2]
            confFile.invervalDays = intervalDays
            confFile.discount = discount
            fs.writeFileSync(fileName, JSON.stringify(confFile), 'utf8');
            console.log('Interval set to ' + intervalDays + ' days')
            console.log('Discount set to ' + discount)
        }

        // Show all items
        if (args[0] == 3) {
            console.log("Loading items...");
            const content = await items.getAllItems();
            console.log(content);
        }

        // Refresh token generator
        if (args[0] == 4) {
            const fileName = './config.json'
            const grandCodeInput = args[1]
            const refreshToken = await auth.getRefreshToken(grandCodeInput)
            if (refreshToken.includes('Failed')) {
                console.log(refreshToken);
                process.exit(1);
            }
            confFile.auth.refreshToken = refreshToken
            fs.writeFileSync(fileName, JSON.stringify(confFile), 'utf8');
            if (grandCodeInput && refreshToken) {
                console.log("Keys set succesfully!");
            }
        }

        // Bulk reduce price
        if (args[0] == 5) {
            console.log("Reducing item price by " + confFile.discount);
            await items.bulkDiscount(confFile.discount);
        }

        // Get interval for creating scheduled task
        if (args[0] == 6) {
            console.log(confFile.invervalDays ? confFile.invervalDays : 1)
        }
    } catch (e) {
        reporter.logError(e.message)
        console.log(e.message)
    }

    process.exit(1);
});




