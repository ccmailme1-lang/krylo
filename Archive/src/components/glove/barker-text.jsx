// Variable name: lowercase
const barker = ({ etr_text }) => {
  return (
    <div className="barker-container">
      <h1 className="kinetic-text">
        {etr_text.toLowerCase()}
      </h1>
    </div>
  );
};

export default barker;