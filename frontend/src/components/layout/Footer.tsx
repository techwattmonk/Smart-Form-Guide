'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy-policy' },
        { name: 'Terms & Conditions', href: '/terms-conditions' },
        { name: 'EULA', href: '/eula' },
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About WattMonk', href: 'https://www.wattmonk.com/about' },
        { name: 'Contact Us', href: 'https://www.wattmonk.com/contact' },
        { name: 'Support', href: 'mailto:support@wattmonk.com' },
      ]
    },
    {
      title: 'Services',
      links: [
        { name: 'Solar Design', href: 'https://www.wattmonk.com/services/solar-design' },
        { name: 'Engineering', href: 'https://www.wattmonk.com/services/engineering' },
        { name: 'Permit Services', href: 'https://www.wattmonk.com/services/permits' },
      ]
    }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="col-span-1"
          >
            <h3 className="text-lg font-bold mb-4">Smart Form Guide</h3>
            <p className="text-gray-400 text-sm mb-4">
              AI-powered document processing and permit application assistance for solar professionals.
            </p>
            <p className="text-gray-400 text-xs">
              Powered by WattMonk Technologies
            </p>
          </motion.div>

          {/* Footer Links */}
          {footerLinks.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              className="col-span-1"
            >
              <h4 className="text-sm font-semibold mb-4 text-gray-300">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('http') || link.href.startsWith('mailto') ? (
                      <a
                        href={link.href}
                        target={link.href.startsWith('http') ? '_blank' : undefined}
                        rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="border-t border-gray-800 mt-8 pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} WattMonk Technologies Private Limited. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="https://www.wattmonk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                WattMonk.com
              </a>
              <a
                href="mailto:legal@wattmonk.com"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Legal Inquiries
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
