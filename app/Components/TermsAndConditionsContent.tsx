// app/Components/TermsAndConditionsContent.tsx
import React from 'react';

const TermsAndConditionsContent = () => (
  <>
    <p className="font-semibold text-red-600">
      DISCLAIMER: This is a sample Terms and Conditions agreement. You should consult with a legal professional to ensure this policy is appropriate for your specific needs and complies with all applicable laws.
    </p>

    <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>

    <p>Welcome to AnonMsg! These terms and conditions outline the rules and regulations for the use of AnonMsg's Website, located at [Your Website URL].</p>

    <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use AnonMsg if you do not agree to take all of the terms and conditions stated on this page.</p>

    <h4 className="font-semibold text-md mt-2">1. Definitions</h4>
    <p>The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and all Agreements: "Client", "You" and "Your" refers to you, the person log on this website and compliant to the Company’s terms and conditions. "The Company", "Ourselves", "We", "Our" and "Us", refers to our Company. "Party", "Parties", or "Us", refers to both the Client and ourselves.</p>

    <h4 className="font-semibold text-md mt-2">2. Use of the Service</h4>
    <p>2.1. You must be at least 13 years old to use AnonMsg. By using AnonMsg, you represent and warrant that you meet this age requirement.</p>
    <p>2.2. You are responsible for maintaining the confidentiality of your account and password, if applicable, and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.</p>
    <p>2.3. You agree not to use the Service for any illegal or unauthorized purpose. You agree to comply with all local laws regarding online conduct and acceptable content.</p>
    <p>2.4. You must not transmit any worms or viruses or any code of a destructive nature.</p>
    <p>2.5. You are solely responsible for your conduct and any data, text, information, screen names, graphics, photos, profiles, audio and video clips, links ("Content") that you submit, post, and display on the AnonMsg service.</p>

    <h4 className="font-semibold text-md mt-2">3. User-Generated Content and Anonymity</h4>
    <p>3.1. AnonMsg allows users to send and receive messages anonymously. The sender's identity is not disclosed to the recipient through the platform, and recipients receive messages without knowing the sender's identity, other than any alias the sender may choose to use.</p>
    <p>3.2. You acknowledge that messages you receive are from users who are anonymous to you. We do not verify the identity of message senders beyond the mechanisms described in our service.</p>
    <p>3.3. You are solely responsible for the content of messages you send and receive. You agree not to send messages that are:</p>
    <ul className="list-disc list-inside ml-4">
      <li>Defamatory, obscene, pornographic, vulgar, or offensive.</li>
      <li>Promoting illegal activity, discrimination, bigotry, racism, hatred, harassment, or harm against any individual or group.</li>
      <li>Violent or threatening or promote violence or actions that are threatening to any other person.</li>
      <li>Infringing, misappropriating, or violating a third party’s patent, copyright, trademark, trade secret, moral rights, or other intellectual property rights, or rights of publicity or privacy.</li>
    </ul>

    <h4 className="font-semibold text-md mt-2">4. Disclaimer of Liability for Messages</h4>
    <p><strong>4.1. You understand and agree that AnonMsg serves as a platform for anonymous communication. We do not monitor, control, or endorse the content of messages sent or received through the Service.</strong></p>
    <p><strong>4.2. AnonMsg expressly disclaims any and all liability in connection with user-generated content and messages. You acknowledge that you may be exposed to content that is inaccurate, offensive, indecent, or objectionable, and you agree to waive, and hereby do waive, any legal or equitable rights or remedies you have or may have against AnonMsg with respect thereto.</strong></p>
    <p><strong>4.3. We are not responsible for the conduct, whether online or offline, of any user of the Service. We are not responsible for any problems or technical malfunction of any telephone network or lines, computer online systems, servers or providers, computer equipment, software, failure of email or players on account of technical problems or traffic congestion on the Internet or at any website or combination thereof, including injury or damage to users or to any other person's computer related to or resulting from participating or downloading materials in connection with the Web and/or in connection with the Service.</strong></p>
    <p><strong>4.4. Under no circumstances will AnonMsg, its owners, affiliates, employees, or agents be liable for any loss or damage, including personal injury or death, resulting from anyone's use of the Website or the Service, any Content posted on the Website or transmitted to Users, or any interactions between users of the Website, whether online or offline.</strong></p>
    <p><strong>4.5. If you have a dispute with one or more users, you release us (and our officers, directors, agents, subsidiaries, joint ventures and employees) from claims, demands and damages (actual and consequential) of every kind and nature, known and unknown, arising out of or in any way connected with such disputes.</strong></p>


    <h4 className="font-semibold text-md mt-2">5. Intellectual Property</h4>
    <p>Unless otherwise stated, AnonMsg and/or its licensors own the intellectual property rights for all material on AnonMsg (excluding user-generated content). All intellectual property rights are reserved. You may access this from AnonMsg for your own personal use subjected to restrictions set in these terms and conditions.</p>
    <p>You must not:</p>
    <ul className="list-disc list-inside ml-4">
      <li>Republish material from AnonMsg</li>
      <li>Sell, rent or sub-license material from AnonMsg</li>
      <li>Reproduce, duplicate or copy material from AnonMsg</li>
      <li>Redistribute content from AnonMsg</li>
    </ul>

    <h4 className="font-semibold text-md mt-2">6. Termination</h4>
    <p>We may terminate or suspend your access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
    <p>All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity and limitations of liability.</p>

    <h4 className="font-semibold text-md mt-2">7. Governing Law</h4>
    <p>These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction, e.g., State of California, USA], without regard to its conflict of law provisions.</p>

    <h4 className="font-semibold text-md mt-2">8. Changes to Terms</h4>
    <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

    <h4 className="font-semibold text-md mt-2">9. Contact Us</h4>
    <p>If you have any questions about these Terms, please contact us at [Your Contact Email Address].</p>
  </>
);

export default TermsAndConditionsContent;