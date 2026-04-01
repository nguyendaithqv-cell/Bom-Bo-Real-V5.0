import React from 'react';
import { ArrowLeft, Home, Box, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ARDemo: React.FC = () => {
  const [isSupported, setIsSupported] = React.useState(true);
  const modelRef = React.useRef<any>(null);

  const [debugInfo, setDebugInfo] = React.useState<string[]>([]);

  const logDebug = (msg: string) => {
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  React.useEffect(() => {
    logDebug('ARDemo component mounted');
    const modelUrl = "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/SimpleHouse/glTF-Binary/SimpleHouse.glb";
    logDebug(`Model URL: ${modelUrl}`);
    
    const modelViewer = modelRef.current;
    if (modelViewer) {
      modelViewer.addEventListener('load', () => {
        logDebug('Model loaded successfully');
      });
      modelViewer.addEventListener('error', (error: any) => {
        logDebug(`Model failed to load. Check connection.`);
        console.error('Model failed to load:', error);
      });
    }

    // Check if model-viewer is supported
    const isDefined = !!(window.customElements && window.customElements.get('model-viewer'));
    setIsSupported(isDefined);
    logDebug(`model-viewer defined: ${isDefined}`);
    
    if (!isDefined) {
      // Try to re-check after 2 seconds
      setTimeout(() => {
        const stillDefined = !!(window.customElements && window.customElements.get('model-viewer'));
        setIsSupported(stillDefined);
        logDebug(`model-viewer defined after timeout: ${stillDefined}`);
      }, 2000);
    }
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const testBox = () => {
    if (modelRef.current) {
      logDebug('Switching to Test Box...');
      modelRef.current.src = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pt-20">
      {/* Fallback for debugging - VISIBLE */}
      <div className="bg-blue-100 p-2 text-center text-xs text-blue-800 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-4">
          <span>Hệ thống AR đang khởi tạo...</span>
          <button 
            onClick={handleReload}
            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
          >
            Tải lại trang
          </button>
          <button 
            onClick={testBox}
            className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
          >
            Thử mẫu khác
          </button>
        </div>
        {debugInfo.length > 0 && (
          <div className="text-[10px] opacity-70 font-mono">
            {debugInfo.map((info, i) => <div key={i}>{info}</div>)}
          </div>
        )}
      </div>
      {!isSupported && (
        <div className="bg-red-100 p-4 text-center text-red-800 font-bold">
          Trình duyệt của bạn chưa hỗ trợ hoặc đang tải thư viện AR. Vui lòng thử lại sau giây lát hoặc sử dụng Chrome/Safari bản mới nhất.
        </div>
      )}
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Quay lại</span>
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Demo Công nghệ AR (Thực tế tăng cường)</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden mb-8">
          {/* AR Viewer Container */}
          <div className="aspect-square md:aspect-video bg-neutral-100 relative group border-2 border-orange-200 rounded-2xl overflow-hidden min-h-[300px]">
            <model-viewer
              ref={modelRef}
              key="house-v2026-final-v3"
              src="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/SimpleHouse/glTF-Binary/SimpleHouse.glb"
              poster="https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/SimpleHouse/screenshot/screenshot.png"
              alt="Mô hình Nhà Phố Demo"
              ar
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              shadow-intensity="1"
              auto-rotate
              loading="eager"
              reveal="auto"
              style={{ width: '100%', height: '100%', backgroundColor: '#f5f5f5', display: 'block' }}
            >
              <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-neutral-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-neutral-500 font-medium">Đang tải mô hình 3D...</p>
                </div>
              </div>
              <button 
                slot="ar-button" 
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95 z-[100] pointer-events-auto"
              >
                <Box size={20} />
                XEM NHÀ MẪU TRÊN ĐẤT (AR)
              </button>
            </model-viewer>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <Home size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Mẫu Nhà Phố Hiện Đại (Demo)</h2>
                <p className="text-neutral-500 text-sm">Tỉ lệ thực tế 1:1 • Tích hợp WebAR</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">Diện tích</p>
                <p className="font-semibold text-neutral-800">5m x 20m</p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">Kết cấu</p>
                <p className="font-semibold text-neutral-800">1 Trệt, 1 Lầu</p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">Pháp lý</p>
                <p className="font-semibold text-neutral-800">Sổ hồng riêng</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <Layers size={18} className="text-orange-600" />
                Hướng dẫn trải nghiệm AR:
              </h3>
              <ol className="space-y-3 text-neutral-600 text-sm list-decimal list-inside">
                <li>Sử dụng điện thoại di động (iPhone hoặc Android đời mới).</li>
                <li>Bấm nút <span className="font-bold text-orange-600">"XEM NHÀ MẪU TRÊN ĐẤT (AR)"</span> ở trên.</li>
                <li>Cho phép trình duyệt truy cập Camera nếu được hỏi.</li>
                <li>Rê camera xuống mặt phẳng (sàn nhà hoặc mặt đất) để AI nhận diện.</li>
                <li>Chạm vào màn hình để đặt ngôi nhà xuống và bắt đầu đi bộ xung quanh để ngắm nhìn.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center">
          <p className="text-orange-800 font-medium mb-2">Lưu ý cho anh:</p>
          <p className="text-orange-700 text-sm">
            Đây là bản Demo kỹ thuật. Trong thực tế, em sẽ thay thế mô hình này bằng các mẫu nhà phố, nhà vườn sang trọng tại Bình Phước để khách hàng của anh có trải nghiệm chân thực nhất.
          </p>
        </div>
      </main>
    </div>
  );
};
