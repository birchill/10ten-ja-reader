//
//  ViewController.swift
//  Shared (App)
//
//  Created by Brian Birtles on 2021/07/05.
//

import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import OSLog
import SafariServices
typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "jp.co.birchill.tenten-ja-reader.Extension"

#if os(iOS)
struct Device {
    static let SCREEN_WIDTH      = Int(UIScreen.main.bounds.size.width)
    static let SCREEN_HEIGHT     = Int(UIScreen.main.bounds.size.height)
    static let SCREEN_MAX_LENGTH = Int(max(SCREEN_WIDTH, SCREEN_HEIGHT))
    static let IS_IPAD           = UIDevice.current.userInterfaceIdiom == .pad
    static let IS_IPHONE         = UIDevice.current.userInterfaceIdiom == .phone && SCREEN_MAX_LENGTH < 812
    static let IS_IPHONE_PRO     = UIDevice.current.userInterfaceIdiom == .phone && SCREEN_MAX_LENGTH >= 812
}
#endif

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

#if os(macOS)
    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "jp.co.birchill.tenten-ja-reader",
        category: "Welcome"
    )
#endif

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

#if os(iOS)
        self.webView.scrollView.isScrollEnabled = false
#endif

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        if (Device.IS_IPAD) {
            webView.evaluateJavaScript("show('ipad')")
        } else if (Device.IS_IPHONE_PRO) {
            webView.evaluateJavaScript("show('iphone-pro')")
        } else {
            webView.evaluateJavaScript("show('iphone')")
        }
#elseif os(macOS)
        webView.evaluateJavaScript("show('mac')")

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                webView.evaluateJavaScript("show('mac', \(state.isEnabled)")
            }
        }
#endif
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
#if os(macOS)
        if (message.body as! String != "open-preferences") {
            return;
        }

        self.showExtensionPreferences()

#endif
    }

#if os(macOS)
    private static let maxExtensionWaitTime: TimeInterval = 15
    private static let extensionPollInterval: TimeInterval = 1

    private func showExtensionPreferences() {
        webView.evaluateJavaScript("""
            (function() {
                var btn = document.querySelector('button.open-preferences');
                btn.disabled = true;
                btn.textContent = 'Opening Safari Extensions Preferences\u{2026}';
            })()
        """)

        let startTime = Date()
        waitForExtensionThenOpenPreferences(startTime: startTime)
    }

    private func waitForExtensionThenOpenPreferences(startTime: Date) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            guard let error = error else {
                DispatchQueue.main.async {
                    NSApplication.shared.terminate(nil)
                }
                return
            }

            let sfError = error as NSError
            let isNotFound = sfError.domain == "SFErrorDomain" && sfError.code == 1

            let elapsed = Date().timeIntervalSince(startTime)
            if isNotFound && elapsed < Self.maxExtensionWaitTime {
                self.logger.info("Extension not yet available (\(String(format: "%.1f", elapsed))s elapsed), retrying\u{2026}")
                DispatchQueue.main.asyncAfter(deadline: .now() + Self.extensionPollInterval) {
                    self.waitForExtensionThenOpenPreferences(startTime: startTime)
                }
                return
            }

            self.logger.error("Error launching extension preferences after \(String(format: "%.1f", elapsed))s: \(error.localizedDescription, privacy: .public)")

            DispatchQueue.main.async {
                self.webView.evaluateJavaScript("""
                    (function() {
                        var btn = document.querySelector('button.open-preferences');
                        btn.disabled = false;
                        btn.textContent = 'Quit and Open Safari Extensions Preferences\u{2026}';
                    })()
                """)

                let alert = NSAlert()
                alert.alertStyle = .warning
                alert.messageText = "Couldn't open Safari extension preferences."
                if isNotFound {
                    alert.informativeText = "Safari could not find the extension. Try quitting Safari and reopening it, then try again."
                } else {
                    alert.informativeText = error.localizedDescription
                }
                alert.addButton(withTitle: "OK")
                alert.runModal()
            }
        }
    }
#endif

}
