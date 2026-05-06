import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, Bell, MapPin } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="text-gray-500 text-sm">Last updated: January 24, 2026</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="w-5 h-5 text-indigo-600" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>We collect information that you provide directly to us:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Name, email address, and employee ID</li>
                <li>Mobile number for contact purposes</li>
                <li>Department and role information</li>
                <li>Profile photo (optional)</li>
                <li>Attendance records (check-in/check-out times)</li>
                <li>Leave requests and approvals</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-indigo-600" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Track and manage employee attendance</li>
                <li>Process leave requests and approvals</li>
                <li>Generate attendance reports for administrators</li>
                <li>Send notifications about attendance and leave status</li>
                <li>Maintain accurate employee records</li>
                <li>Improve our services and user experience</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Permissions & Data Collection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <div>
                <h4 className="font-semibold mb-2">Location Access</h4>
                <p>We may request location access to verify attendance check-ins. Location data is used only for attendance verification and is not shared with third parties.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Camera Access</h4>
                <p>Camera access is requested only for uploading profile photos. We do not access your camera without your explicit permission.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Notifications</h4>
                <p>We send notifications for attendance reminders, check-in confirmations, and leave status updates. You can manage notification preferences in your device settings.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-indigo-600" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>We take data security seriously and implement appropriate measures to protect your information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All data is encrypted in transit and at rest</li>
                <li>Access to personal information is restricted to authorized personnel only</li>
                <li>Regular security audits and updates</li>
                <li>Secure authentication and session management</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
                Your Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Update or correct your information</li>
                <li>Request deletion of your data (subject to legal requirements)</li>
                <li>Opt-out of non-essential notifications</li>
                <li>Withdraw consent for optional data collection</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700">
              <p>We retain your attendance and leave records as per company policy and legal requirements. Personal information is retained for as long as you are an active employee, and for a reasonable period thereafter for legal and audit purposes.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700">
              <p>This application is hosted on the Base44 platform. We do not share your personal information with third parties except as necessary to provide our services or as required by law.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700">
              <p>We may update this privacy policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this policy.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-indigo-50">
            <CardHeader>
              <CardTitle className="text-lg">Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700">
              <p>If you have any questions about this privacy policy or our data practices, please contact your organization's HR department or system administrator.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}