import React from 'react';
import { Car, Booking } from '@/api/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BookingModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export function BookingModal({ booking, onClose }: BookingModalProps) {
  if (!booking) {
    return null;
  }

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            Details for booking {booking.booking_id}
          </DialogDescription>
        </DialogHeader>
        <div>
          <p><strong>Car:</strong> {booking.form_data.car.name}</p>
          <p><strong>Start Date:</strong> {booking.form_data.dates.start}</p>
          <p><strong>End Date:</strong> {booking.form_data.dates.end}</p>
          <p><strong>Status:</strong> {booking.status}</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BookingModal;
