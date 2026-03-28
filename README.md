# ⚖️ T&C Decoder

**Never blindly click "I Agree" again.** T&C Decoder is a privacy-first Chrome Extension that uses AI to read massive Terms of Service agreements and translate them into a brutally honest Danger Score, highlighting specific Red Flags and predatory clauses.

Unlike generic AI summarizers, T&C Decoder acts like a grumpy privacy lawyer. It actively penalizes companies for data harvesting, using your likeness in ads, and hiding rules in "Shadow Policies" (external links).

## ✨ Features
* **0-100 Danger Score:** Instantly know how predatory a site's terms are.
* **Red Flag Extraction:** Pulls exact quotes and clauses you need to worry about.
* **Shadow Policy Detection:** Penalizes companies that force you to agree to 15 different unread external policies.
* **100% Private (Bring Your Own Key):** Your data never touches our servers. The extension communicates directly from your browser to Anthropic's API using your own key. 

## 🚀 Installation (Developer Mode)

Since this is a BYOK (Bring Your Own Key) extension, it is currently side-loaded via Chrome's Developer Mode.

1. Clone this repository or download the ZIP file and extract it.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top right corner, toggle **Developer mode** to ON.
4. Click the **Load unpacked** button in the top left.
5. Select the folder containing this extension's files.
6. The ⚖️ T&C Decoder icon should now appear in your browser toolbar!

## ⚙️ Setup & Usage

To use the decoder, you will need an Anthropic API key (this powers the Claude Sonnet 3.5 AI model under the hood).

1. Go to the [Anthropic Console](https://console.anthropic.com/) and create an account/log in.
2. Generate a new API Key (it should start with `sk-ant-`).
3. Click the T&C Decoder icon in your Chrome toolbar.
4. Click the **Settings (⚙)** icon.
5. Paste your API key and click **Save**.
6. Navigate to any Terms & Conditions or Privacy Policy page, open the extension, and click **Extract & Decode**!

## 🛠️ How the Scoring Works

The Danger Score is not a random AI "vibe check." It uses a rigid, mathematical prompt injected into the LLM that heavily weights severe privacy violations over standard legal boilerplate:

* **High Penalties:** Generative AI training on user data, likeness used in paid ads, irrevocable content licenses that survive account deletion.
* **Medium Penalties:** Deceptive "Shadow Policy" structures, cross-site tracking.
* **Low Penalties:** Standard mandatory arbitration, shortened legal claim windows.

## 🤝 Contributing
Pull requests are welcome! Whether it's UI polish, better text extraction logic, or refining the prompt engineering to catch new legal loopholes, feel free to contribute.

## 📄 License
This project is licensed under the GPLv3 License - see the LICENSE file for details.
