# RaaS Platform Testing Scripts

This directory contains automated testing scripts for the RaaS (Roof as a Service) solar platform.

## Files

- `installation-simulator.js` - Simulates installation data for testing
- `raas-test-suite.js` - Comprehensive end-to-end tests using Puppeteer
- `run-tests.js` - Utility script to run all tests
- `automated-raas-test.js` - Complete end-to-end automated testing script using Playwright

## Running Tests

Make sure you have Node.js installed and have installed the dependencies:

```bash
npm install
```

### Running the Full Automated Test Suite

This script automatically registers as super admin, completes profile, tests admin features, and analyzes logs:

```bash
# Make sure the application is running
node automated-raas-test.js
```

### Running the Installation Simulator

This script populates the database with sample distributors, installations, and energy data:

```bash
node installation-simulator.js
```

### Running Automated UI Tests

Start the RaaS platform locally on port 3000 first:

```bash
# From the project root
npm run dev
```

Then in a separate terminal, run the UI tests:

```bash
node raas-test-suite.js
```

Or use the test runner which provides a cleaner output:

```bash
node run-tests.js
```

## Test Results

- Screenshots are saved in the `screenshots` directory
- Test logs are saved in the `logs` directory
- Videos of test runs are saved in the `videos` directory

## Configuration

You can modify test configuration by editing the `config` object in each script:

- `baseUrl` - URL of the RaaS platform (default: http://localhost:3000)
- `credentials` - Login credentials for different user types
- `profile` - Profile information for registration
- `logPath` - Path to save test logs
- `screenshotDir` - Directory to save screenshots

## Adding New Tests

To add new test scenarios:

1. Create a new test function in one of the test files
2. Add it to the main test execution function
3. Update the results object to track its status 