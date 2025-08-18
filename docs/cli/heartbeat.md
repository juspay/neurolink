# NeuroLink CLI: `heartbeat` Command

The `neurolink heartbeat` command is a powerful diagnostic tool designed to provide a real-time status check of your configured AI providers. It helps you quickly identify and resolve connectivity and configuration issues, ensuring that your development environment is always ready for use.

## Key Features

- **Real-Time Health Checks:** The command pings each configured provider's endpoint to verify service availability and network connectivity.
- **Credential Validation:** It implicitly tests your stored API keys by making a lightweight, authenticated request to each provider.
- **Model Accessibility:** It confirms that the default models specified in your configuration are accessible and ready for use.
- **User-Friendly Output:** The results are displayed in a clear, color-coded format, making it easy to spot any issues at a glance.

## Usage

To check the status of all configured providers, simply run the following command:

```bash
neurolink heartbeat
```

### Checking a Specific Provider

You can also check the status of a single provider by using the `--provider` flag:

```bash
neurolink heartbeat --provider openai
```

## Benefits

- **Rapid Diagnostics:** Quickly identify the root cause of any connectivity issues, whether it's a network problem, an invalid API key, or a provider outage.
- **Save Debugging Time:** Avoid the frustration of debugging your code only to find that the issue lies with the provider or your configuration.
- **Ensure Readiness:** Run the `heartbeat` command before starting a development session to ensure that all your tools are in working order.
