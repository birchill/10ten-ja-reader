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

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            guard error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                NSApplication.shared.terminate(nil)
            }
        }
#endif
    }

}
