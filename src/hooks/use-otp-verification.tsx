
'use client';

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { OtpVerificationModal } from '@/components/auth/OtpVerificationModal';

interface OtpVerificationContextType {
  requestVerification: (identifier: string, type: 'generic' | 'payout_request') => Promise<boolean>;
}

const OtpVerificationContext = createContext<OtpVerificationContextType | undefined>(undefined);

export function OtpVerificationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [verificationProps, setVerificationProps] = useState<{
    identifier: string;
    type: 'generic' | 'payout_request';
    resolve: (value: boolean) => void;
  } | null>(null);

  const requestVerification = useCallback((identifier: string, type: 'generic' | 'payout_request' = 'generic') => {
    return new Promise<boolean>((resolve) => {
      setVerificationProps({ identifier, type, resolve });
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
          type={verificationProps.type}
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
