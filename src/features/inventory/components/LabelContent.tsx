import type { InternalInventoryLabel } from '../types';

interface LabelContentProps {
  labelData: InternalInventoryLabel;
  logoDataUrl: string;
  forPrint: boolean;
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '5.5pt',
  color: '#666',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  lineHeight: '1',
};

export function LabelContent({ labelData, logoDataUrl, forPrint }: LabelContentProps) {
  return (
    <div
      style={{
        width: '1.5in',
        height: '2in',
        backgroundColor: 'white',
        color: 'black',
        padding: '0.08in',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        border: forPrint ? 'none' : '1px solid #ddd',
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '0.02in' }}>
        {logoDataUrl && (
          <img
            src={logoDataUrl}
            alt="CULT Logo"
            style={{
              width: '0.85in',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
            }}
          />
        )}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.03in',
        flex: 1,
      }}>
        <div style={{
          borderBottom: '1px solid #333',
          paddingBottom: '0.02in',
        }}>
          <div style={fieldLabelStyle}>
            Strain
          </div>
          <div style={{
            fontSize: '8.5pt',
            fontWeight: 'bold',
            marginTop: '0.01in',
            lineHeight: '1.1',
          }}>
            {labelData.strain}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.03in',
          borderBottom: '1px solid #ddd',
          paddingBottom: '0.03in',
        }}>
          <div>
            <div style={fieldLabelStyle}>Batch ID</div>
            <div style={{
              fontSize: '6.5pt',
              fontWeight: 'bold',
              marginTop: '0.01in',
              lineHeight: '1.15',
            }}>
              {labelData.batch_id}
            </div>
          </div>

          <div>
            <div style={fieldLabelStyle}>Weight</div>
            <div style={{
              fontSize: '6.5pt',
              fontWeight: 'bold',
              marginTop: '0.01in',
              lineHeight: '1.15',
            }}>
              {labelData.weight_grams.toFixed(1)}g
            </div>
          </div>

          <div>
            <div style={fieldLabelStyle}>Pkg ID</div>
            <div style={{
              fontSize: '6pt',
              fontWeight: 'bold',
              marginTop: '0.01in',
              lineHeight: '1.15',
              wordBreak: 'break-all',
            }}>
              {labelData.package_id}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.03in',
        }}>
          <div>
            <div style={fieldLabelStyle}>Product Type</div>
            <div style={{
              fontSize: '7pt',
              fontWeight: '600',
              marginTop: '0.01in',
              lineHeight: '1.15',
            }}>
              {labelData.product_type}
            </div>
          </div>

          <div>
            <div style={fieldLabelStyle}>Harvest Date</div>
            <div style={{
              fontSize: '7pt',
              fontWeight: '600',
              marginTop: '0.01in',
              lineHeight: '1.15',
            }}>
              {labelData.harvest_date}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        fontSize: '4.5pt',
        color: '#999',
        textAlign: 'center',
        marginTop: '0.02in',
        borderTop: '1px solid #eee',
        paddingTop: '0.02in',
        lineHeight: '1',
      }}>
        INTERNAL USE ONLY - {labelData.package_id}
      </div>
    </div>
  );
}
