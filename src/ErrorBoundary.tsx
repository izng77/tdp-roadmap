import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
         <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
           <div className="max-w-md bg-white rounded-2xl p-8 shadow-xl border border-red-100">
             <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 text-3xl font-bold">!</div>
             <h1 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h1>
             <p className="text-slate-500 mb-6">A critical error occurred. Please refresh the page to continue.</p>
             <button 
               onClick={() => window.location.reload()} 
               className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition-colors w-full"
             >
               Refresh Page
             </button>
             {this.state.error && (
               <div className="mt-6 p-4 bg-slate-100 rounded-lg text-left text-xs font-mono text-slate-700 overflow-auto max-h-32">
                 {this.state.error.message}
               </div>
             )}
           </div>
         </div>
      );
    }

    return this.props.children;
  }
}

