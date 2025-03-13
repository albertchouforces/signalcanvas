import { CircleAlert, CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | '';
}

const Notification = ({ message, type }: NotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    
    // Start hiding animation after 2.5s
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [message]);

  const bgColor = type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const Icon = type === 'success' ? CircleCheck : CircleAlert;

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center p-4 border-l-4 rounded shadow-md
                 transition-opacity duration-300 ${bgColor} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ zIndex: 1000 }}
    >
      <Icon className={`w-5 h-5 mr-2 ${textColor}`} />
      <span className={`font-medium ${textColor}`}>{message}</span>
    </div>
  );
};

export default Notification;
