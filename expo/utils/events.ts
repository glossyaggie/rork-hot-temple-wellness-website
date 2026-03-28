type Listener = () => void;

class SimpleEventBus {
  private passesListeners: Set<Listener> = new Set();
  private bookingsListeners: Set<Listener> = new Set();

  onPassesChanged(cb: Listener) {
    this.passesListeners.add(cb);
    return () => this.passesListeners.delete(cb);
  }
  emitPassesChanged() {
    this.passesListeners.forEach((cb) => {
      try { cb(); } catch {}
    });
  }

  onBookingsChanged(cb: Listener) {
    this.bookingsListeners.add(cb);
    return () => this.bookingsListeners.delete(cb);
  }
  emitBookingsChanged() {
    this.bookingsListeners.forEach((cb) => {
      try { cb(); } catch {}
    });
  }
}

const bus = new SimpleEventBus();
export const onPassesChanged = (cb: Listener) => bus.onPassesChanged(cb);
export const emitPassesChanged = () => bus.emitPassesChanged();
export const onBookingsChanged = (cb: Listener) => bus.onBookingsChanged(cb);
export const emitBookingsChanged = () => bus.emitBookingsChanged();
