
'use client';

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { OtpVerificationModal } from '@/components/auth/OtpVerificationModal';

interface OtpVerificationContextType {
  requestVerification: (identifier: string) => Promise<boolean>;
}

const OtpVerificationContext = createContext<OtpVerificationContextType | undefined>(undefined);

export function OtpVerificationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [verificationProps, setVerificationProps] = useState<{
    identifier: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const requestVerification = useCallback((identifier: string) => {
    return new Promise<boolean>((resolve) => {
      setVerificationProps({ identifier, resolve });
      setIsOpen(true);
    });
  }, []);

  const handleClose = (verified: boolean) => {
    setIsOpen(false);
    verificationProps?.resolve(verified);
    setVerificationProps(null);
  };

  return (
    <OtpVerificationContext.Provider value={{ requestVerification }}>
      {children}
      {verificationProps && (
        <OtpVerificationModal
          isOpen={isOpen}
          onClose={handleClose}
          identifier={verificationProps.identifier}
          isDismissible={true}
          title="Confirm Your Identity"
          description="To protect your account, please complete this quick verification. A 6-digit code has been sent to your email."
        />
      )}
    </OtpVerificationContext.Provider>
  );
}

export const useOtpVerification = () => {
  const context = useContext(OtpVerificationContext);
  if (context === undefined) {
    throw new Error('useOtpVerification must be used within an OtpVerificationProvider');
  }
  return context;
};
