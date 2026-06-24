import type { ReactNode } from 'react';
import { motion } from 'motion/react';

type PageWrapperProps = {
    children: ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.1 }}
        >
            {children}
        </motion.div>
    );
}