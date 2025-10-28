import React from 'react';

const Home: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '60px 40px',
        borderRadius: '20px',
        textAlign: 'center',
        marginBottom: '40px',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px', fontWeight: 'bold' }}>
          Mon Valley Pollution Tracking System
        </h1>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '30px', fontWeight: '300' }}>
          A Project by Valley Clean Air Now (VCAN)
        </h2>
        <p style={{ fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
          Empowering Mon Valley residents with real-time air quality data, health tracking, 
          and evidence-based advocacy tools to fight for clean air in our communities.
        </p>
      </div>

      {/* VCAN Connection */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        marginBottom: '30px',
        border: '2px solid #16A085'
      }}>
        <h3 style={{ color: '#16A085', fontSize: '1.8rem', marginBottom: '15px' }}>
          🌍 About Valley Clean Air Now
        </h3>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#333' }}>
          Valley Clean Air Now (VCAN) is a community-led movement fighting for the residents 
          of the Mon Valley. Founded to address the air quality crisis affecting Clairton, 
          Braddock, Dravosburg, and surrounding communities.
        </p>
        
        <div style={{ marginTop: '25px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
            <h4 style={{ color: '#667eea', marginBottom: '10px' }}>📍 Location</h4>
            <p style={{ color: '#666', margin: 0 }}>
              635 Monongahela Avenue, First FL Rear Office<br />
              Glassport, PA 15045
            </p>
          </div>
          
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
            <h4 style={{ color: '#667eea', marginBottom: '10px' }}>📞 Contact</h4>
            <p style={{ color: '#666', margin: 0 }}>
              Phone: (412) 226-6512<br />
              Email: info@valleycleanair.com
            </p>
          </div>
          
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
            <h4 style={{ color: '#667eea', marginBottom: '10px' }}>🌐 Visit VCAN</h4>
            <p style={{ color: '#666', margin: 0 }}>
              <a href="https://www.valleycleanair.com" target="_blank" rel="noopener noreferrer" 
                 style={{ color: '#16A085', textDecoration: 'none', fontWeight: 'bold' }}>
                valleycleanair.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        marginBottom: '40px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 8px 25px rgba(245, 87, 108, 0.3)'
        }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>🎯 Mission</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
            To empower Mon Valley residents with data-driven tools to track air pollution, 
            document health impacts, and advocate for environmental justice through 
            evidence-based community organizing.
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)'
        }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>👁️ Vision</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
            A future where Mon Valley communities breathe clean air, where industrial 
            polluters are held accountable, and where residents have the tools and 
            evidence needed to advocate for their health and wellbeing.
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 8px 25px rgba(250, 112, 154, 0.3)'
        }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>🌟 Goals</h3>
          <ul style={{ fontSize: '1.1rem', lineHeight: '2', paddingLeft: '20px' }}>
            <li>Real-time air quality monitoring</li>
            <li>Health impact documentation</li>
            <li>Policy advocacy support</li>
            <li>Community empowerment</li>
          </ul>
        </div>
      </div>

      {/* What This Platform Does */}
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        marginBottom: '40px'
      }}>
        <h3 style={{ color: '#2C3E50', fontSize: '2rem', marginBottom: '30px', textAlign: 'center' }}>
          What This Platform Does
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '25px'
        }}>
          <div style={{
            borderLeft: '4px solid #E74C3C',
            paddingLeft: '20px'
          }}>
            <h4 style={{ color: '#E74C3C', marginBottom: '10px', fontSize: '1.3rem' }}>
              📊 Real-Time Monitoring
            </h4>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Track air quality from PurpleAir sensors and official monitoring stations 
              throughout the Mon Valley in real-time.
            </p>
          </div>

          <div style={{
            borderLeft: '4px solid #3498DB',
            paddingLeft: '20px'
          }}>
            <h4 style={{ color: '#3498DB', marginBottom: '10px', fontSize: '1.3rem' }}>
              🏭 Source Attribution
            </h4>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Connect pollution sources to health impacts using Title V permit data, 
              emissions records, and regulatory compliance information.
            </p>
          </div>

          <div style={{
            borderLeft: '4px solid #9B59B6',
            paddingLeft: '20px'
          }}>
            <h4 style={{ color: '#9B59B6', marginBottom: '10px', fontSize: '1.3rem' }}>
              🏥 Health Tracking
            </h4>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Securely document symptoms and health impacts using the OSAC framework 
              with privacy-by-design architecture.
            </p>
          </div>

          <div style={{
            borderLeft: '4px solid #16A085',
            paddingLeft: '20px'
          }}>
            <h4 style={{ color: '#16A085', marginBottom: '10px', fontSize: '1.3rem' }}>
              📄 Evidence Generation
            </h4>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Generate actionable advocacy reports linking pollution events to health 
              outcomes for regulatory action.
            </p>
          </div>

          <div style={{
            borderLeft: '4px solid #F39C12',
            paddingLeft: '20px'
          }}>
            <h4 style={{ color: '#F39C12', marginBottom: '10px', fontSize: '1.3rem' }}>
              🤖 AI Assistant
            </h4>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Get personalized health advice and pollution information through our 
              AI-powered community health assistant, BreatheAI.
            </p>
          </div>

          <div style={{
            borderLeft: '4px solid #1ABC9C',
            paddingLeft: '20px'
          }}>
            <h4 style={{ color: '#1ABC9C', marginBottom: '10px', fontSize: '1.3rem' }}>
              🔬 Risk Modeling
            </h4>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Calculate exposure risks based on distance to facilities, current 
              air quality, and historical patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '50px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
      }}>
        <h3 style={{ fontSize: '2.2rem', marginBottom: '20px' }}>
          Ready to Make a Difference?
        </h3>
        <p style={{ fontSize: '1.3rem', marginBottom: '30px', maxWidth: '700px', margin: '0 auto 30px' }}>
          Join VCAN and thousands of Mon Valley residents fighting for clean air. 
          Use the navigation menu to explore the platform and start tracking your environment.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://www.valleycleanair.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'white',
              color: '#667eea',
              padding: '15px 40px',
              borderRadius: '30px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              transition: 'transform 0.2s'
            }}
          >
            Visit VCAN Website →
          </a>
        </div>
      </div>

      {/* Footer Note */}
      <div style={{ textAlign: 'center', marginTop: '40px', color: '#999', fontSize: '0.9rem' }}>
        <p>This platform is part of VCAN's Proactive Health and Pollution Advocacy (PHPA) initiative.</p>
        <p style={{ marginTop: '10px' }}>
          Built with ❤️ for the Mon Valley community by Liberate X in partnership with VCAN.
        </p>
      </div>
    </div>
  );
};

export default Home;

