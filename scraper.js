// scraper.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import chalk from 'chalk';

// --- CONFIGURATION ---
const ROBLOX_RELEASE_NOTES_URL = 'https://create.roblox.com/docs/en-us/release-notes/release-notes-664';
const TARGET_TEXT_FRAGMENT = 'A Players capability is introduced as required for Players service';
const CHECK_INTERVAL_MS = 60000;

const WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL';
const USER_ID_TO_PING = 'YOUR_DISCORD_USER_ID';

// State variable to prevent spamming the webhook
let notificationSent = false;

/**
 * Sends a notification to the configured Discord webhook.
 */
async function sendWebhookNotification() {
  const message = {
    content: `🚨 **Roblox Update Alert!** 🚨\n\nThe 'Players capability' update is now **LIVE**! <@${USER_ID_TO_PING}>`,
    embeds: [{
      title: "Release Notes for 664",
      description: "The status for the `Players` capability update has changed to 'Live'.",
      url: ROBLOX_RELEASE_NOTES_URL,
      color: 5814783,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    await axios.post(WEBHOOK_URL, message);
    console.log(chalk.green('Successfully sent webhook notification.'));
    // Set the flag to true so we don't send it again
    notificationSent = true;
  } catch (error) {
    console.error(chalk.red('Error sending webhook notification:'), error.message);
  }
}

/**
 * Main function to run the scraper.
 */
async function checkUpdateStatus() {
  const time = new Date().toLocaleTimeString();
  console.log(chalk.gray(`[${time}]`) + chalk.cyan(' Checking for Roblox update...'));

  try {
    const response = await axios.get(ROBLOX_RELEASE_NOTES_URL, {
      // Use headers to mimic a browser to avoid getting blocked
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const htmlContent = response.data;
    
    const $ = cheerio.load(htmlContent);

    let updateFound = false;
    const tableRows = $('tr');

    tableRows.each((index, element) => {
      const rowText = $(element).text();

      if (rowText.includes(TARGET_TEXT_FRAGMENT)) {
        updateFound = true;
        const status = $(element).find('.MuiChip-label').text().trim();

        if (status.toLowerCase() === 'live') {
          if (!notificationSent) {
            console.log(chalk.green.bold('✅ Update is LIVE! Preparing to send notification...'));
            sendWebhookNotification();
          } else {
            console.log(chalk.green("Update is 'Live'. Notification already sent, skipping."));
          }
        } else {
          // If the status is not 'Live', reset the notification flag
          if (notificationSent) {
            console.log(chalk.yellow('Status changed back from Live. Resetting notification flag.'));
            notificationSent = false;
          }
          console.log(chalk.yellow(`Update is not live. Status: "${status}".`));
        }
        return false;
      }
    });

    if (!updateFound) {
      console.log(chalk.red('Could not find the target update text. The page structure may have changed.'));
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error(chalk.red(`Error fetching the URL: ${error.message}`));
    } else {
        console.error(chalk.red('An unexpected error occurred during scraping:'), error);
    }
  }
}

// --- SCRIPT EXECUTION ---

// Check for placeholder values before starting
if (WEBHOOK_URL.includes('YOUR_DISCORD_WEBHOOK_URL') || USER_ID_TO_PING.includes('YOUR_DISCORD_USER_ID')) {
  console.log(chalk.red.bold('Error: Please replace the placeholder WEBHOOK_URL and USER_ID_TO_PING values in the script.'));
  process.exit(1); // Exit the script
}

// Perform an immediate check when the script starts
console.log(chalk.blue('Starting Roblox Update Checker.'));
checkUpdateStatus();

// Set an interval to run the check every minute
setInterval(checkUpdateStatus, CHECK_INTERVAL_MS);

console.log(chalk.blue(`Scraper will now check for updates every ${CHECK_INTERVAL_MS / 1000} seconds.`));
console.log(chalk.blue('Press Ctrl+C to stop the script.'));