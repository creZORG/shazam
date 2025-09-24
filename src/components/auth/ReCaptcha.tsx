
'use client';

import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface ReCaptchaProps {
  onChange: (token: string | null) => void;
}

export const ReCaptcha: React.FC<ReCaptchaProps> = ({ onChange }) => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.error("reCAPTCHA site key not found. Please set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in your environment variables.");
    return <p className="text-destructive text-sm">reCAPTCHA not configured.</p>;
  }

  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        sitekey={siteKey}
        onChange={onChange}
      />
    </div>
  );
};
